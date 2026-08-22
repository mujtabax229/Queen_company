/*
# Iraq Queen — Wishlist + Product Views tables

- wishlists: user_id, product_id (unique pair), RLS owner-only
- product_views: product_id, session_or_user_id, viewed_at; insert-only, no client read
*/

CREATE TABLE IF NOT EXISTS public.wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wishlists_user_product_unique') THEN
    ALTER TABLE wishlists ADD CONSTRAINT wishlists_user_product_unique UNIQUE (user_id, product_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product ON wishlists(product_id);

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wishlist_select_own" ON wishlists;
CREATE POLICY "wishlist_select_own" ON wishlists FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wishlist_insert_own" ON wishlists;
CREATE POLICY "wishlist_insert_own" ON wishlists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wishlist_delete_own" ON wishlists;
CREATE POLICY "wishlist_delete_own" ON wishlists FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.product_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  session_or_user_id text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_views_product ON product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_product_views_dedup ON product_views(product_id, session_or_user_id, viewed_at DESC);

ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_views_insert_any" ON product_views;
CREATE POLICY "product_views_insert_any" ON product_views FOR INSERT TO anon, authenticated WITH CHECK (true);
