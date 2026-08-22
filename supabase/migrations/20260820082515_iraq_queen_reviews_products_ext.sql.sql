/*
# Iraq Queen — Schema Extension: Products columns + Reviews + Review Images

## New columns on products
- slug (text, unique) — clean URL slug
- created_by, updated_by (uuid FK→auth.users) — editor tracking
- first_published_at (timestamptz) — when product left draft status
- avg_rating (numeric), review_count (integer) — aggregated review stats

## New tables
- reviews: user_id, product_id, rating 1-5, comment, moderation_status, is_verified_purchase
  - UNIQUE(user_id, product_id) — one review per user per product
- review_images: review_id, url — max 3 per review (trigger-enforced)

## Triggers
- generate_slug + auto-assign on insert
- track_product_editor (created_by/updated_by)
- track_first_published (first_published_at)
- set_verified_purchase (checks completed order with product)
- recalc_product_rating (updates avg_rating + review_count on approved reviews)
- enforce_review_image_cap (max 3 images)
*/

-- 1. Add columns to products
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'slug') THEN
    ALTER TABLE products ADD COLUMN slug text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'created_by') THEN
    ALTER TABLE products ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'updated_by') THEN
    ALTER TABLE products ADD COLUMN updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'first_published_at') THEN
    ALTER TABLE products ADD COLUMN first_published_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'avg_rating') THEN
    ALTER TABLE products ADD COLUMN avg_rating numeric(3,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'review_count') THEN
    ALTER TABLE products ADD COLUMN review_count integer DEFAULT 0;
  END IF;
END $$;

-- 2. Slug generation
CREATE OR REPLACE FUNCTION public.generate_slug(input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  counter integer := 0;
  result text;
BEGIN
  base := lower(trim(regexp_replace(input, '[^a-zA-Z0-9\s]', ' ', 'g')));
  base := regexp_replace(base, '\s+', '-', 'g');
  base := trim(base, '-');
  IF base = '' OR base IS NULL THEN base := 'product'; END IF;
  result := base;
  LOOP
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = result) THEN
      RETURN result;
    END IF;
    counter := counter + 1;
    result := base || '-' || counter::text;
  END LOOP;
END;
$$;

UPDATE products SET slug = public.generate_slug(name) WHERE slug IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_slug_key') THEN
    ALTER TABLE products ADD CONSTRAINT products_slug_key UNIQUE (slug);
  END IF;
END $$;

-- 3. Product editor + publish tracking triggers
CREATE OR REPLACE FUNCTION public.track_product_editor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
    NEW.updated_by := auth.uid();
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
      NEW.slug := public.generate_slug(NEW.name);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_editor_trigger ON products;
CREATE TRIGGER products_editor_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION public.track_product_editor();

CREATE OR REPLACE FUNCTION public.track_first_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'draft' AND NEW.status != 'draft' AND NEW.first_published_at IS NULL THEN
    NEW.first_published_at := now();
  ELSIF TG_OP = 'INSERT' AND NEW.status != 'draft' AND NEW.first_published_at IS NULL THEN
    NEW.first_published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_publish_trigger ON products;
CREATE TRIGGER products_publish_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION public.track_first_published();

-- 4. Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  moderation_status text NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected')),
  is_verified_purchase boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_user_product_unique') THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_user_product_unique UNIQUE (user_id, product_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_moderation ON reviews(moderation_status);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_public_read" ON reviews;
CREATE POLICY "reviews_public_read" ON reviews FOR SELECT TO anon, authenticated USING (moderation_status = 'approved');

DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
CREATE POLICY "reviews_insert_own" ON reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
CREATE POLICY "reviews_update_own" ON reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_admin_read_all" ON reviews;
CREATE POLICY "reviews_admin_read_all" ON reviews FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "reviews_admin_update" ON reviews;
CREATE POLICY "reviews_admin_update" ON reviews FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "reviews_admin_delete" ON reviews;
CREATE POLICY "reviews_admin_delete" ON reviews FOR DELETE TO authenticated USING (is_admin());

-- 5. Verified purchase trigger
CREATE OR REPLACE FUNCTION public.set_verified_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_completed boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.customer_id = NEW.user_id AND o.status = 'completed' AND oi.product_id = NEW.product_id
  ) INTO has_completed;
  NEW.is_verified_purchase := COALESCE(has_completed, false);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_verified_trigger ON reviews;
CREATE TRIGGER reviews_verified_trigger BEFORE INSERT ON reviews FOR EACH ROW EXECUTE FUNCTION public.set_verified_purchase();

-- 6. Rating aggregation triggers
CREATE OR REPLACE FUNCTION public.recalc_product_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_id uuid; avg_val numeric; cnt integer;
BEGIN
  p_id := COALESCE(NEW.product_id, OLD.product_id);
  SELECT ROUND(AVG(rating)::numeric, 2), COUNT(*) INTO avg_val, cnt
  FROM reviews WHERE product_id = p_id AND moderation_status = 'approved';
  UPDATE products SET avg_rating = COALESCE(avg_val, 0), review_count = COALESCE(cnt, 0) WHERE id = p_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS reviews_rating_insert ON reviews;
CREATE TRIGGER reviews_rating_insert AFTER INSERT ON reviews FOR EACH ROW EXECUTE FUNCTION public.recalc_product_rating();

DROP TRIGGER IF EXISTS reviews_rating_update ON reviews;
CREATE TRIGGER reviews_rating_update AFTER UPDATE ON reviews FOR EACH ROW
  WHEN (NEW.moderation_status IS DISTINCT FROM OLD.moderation_status OR NEW.rating IS DISTINCT FROM OLD.rating)
  EXECUTE FUNCTION public.recalc_product_rating();

DROP TRIGGER IF EXISTS reviews_rating_delete ON reviews;
CREATE TRIGGER reviews_rating_delete AFTER DELETE ON reviews FOR EACH ROW EXECUTE FUNCTION public.recalc_product_rating();

-- 7. Review images table
CREATE TABLE IF NOT EXISTS public.review_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_images_review ON review_images(review_id);
ALTER TABLE review_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_images_public_read" ON review_images;
CREATE POLICY "review_images_public_read" ON review_images FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_images.review_id AND reviews.moderation_status = 'approved'));

DROP POLICY IF EXISTS "review_images_insert_own" ON review_images;
CREATE POLICY "review_images_insert_own" ON review_images FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_id AND reviews.user_id = auth.uid()));

DROP POLICY IF EXISTS "review_images_admin_delete" ON review_images;
CREATE POLICY "review_images_admin_delete" ON review_images FOR DELETE TO authenticated USING (is_admin());

-- 8. Review image cap (max 3)
CREATE OR REPLACE FUNCTION public.enforce_review_image_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE img_count integer;
BEGIN
  SELECT count(*) INTO img_count FROM review_images WHERE review_id = NEW.review_id;
  IF img_count >= 3 THEN RAISE EXCEPTION 'Maximum 3 images per review'; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS review_images_cap_trigger ON review_images;
CREATE TRIGGER review_images_cap_trigger BEFORE INSERT ON review_images FOR EACH ROW EXECUTE FUNCTION public.enforce_review_image_cap();
