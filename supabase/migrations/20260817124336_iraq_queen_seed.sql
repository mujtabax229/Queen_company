/*
# Iraq Queen — Seed Data

Adds 5 categories and 8 demo products with images for initial store content.
Uses ON CONFLICT DO NOTHING so it is safe to re-run. Image URLs are from Pexels
(license-free). All products are 'available' unless noted.
*/

-- Categories (Arabic names)
insert into public.categories (name, image_url, sort_order) values
  ('أحمر شفاه', 'https://images.pexels.com/photos/7810600/pexels-photo-7810600.jpeg?auto=compress&cs=tinysrgb&h=400&w=400', 1),
  ('عطور', 'https://images.pexels.com/photos/11482458/pexels-photo-11482458.jpeg?auto=compress&cs=tinysrgb&h=400&w=400', 2),
  ('العناية بالبشرة', 'https://images.pexels.com/photos/4173450/pexels-photo-4173450.jpeg?auto=compress&cs=tinysrgb&h=400&w=400', 3),
  ('العناية بالشعر', 'https://images.pexels.com/photos/33525723/pexels-photo-33525723.jpeg?auto=compress&cs=tinysrgb&h=400&w=400', 4),
  ('مكياج', 'https://images.pexels.com/photos/3689976/pexels-photo-3689976.jpeg?auto=compress&cs=tinysrgb&h=400&w=400', 5)
on conflict do nothing;

-- Helper: get category id by name
do $$
declare
  v_lip uuid;
  v_perf uuid;
  v_skin uuid;
  v_hair uuid;
  v_make uuid;
  p uuid;
begin
  select id into v_lip from public.categories where name = 'أحمر شفاه';
  select id into v_perf from public.categories where name = 'عطور';
  select id into v_skin from public.categories where name = 'العناية بالبشرة';
  select id into v_hair from public.categories where name = 'العناية بالشعر';
  select id into v_make from public.categories where name = 'مكياج';

  -- 1. Lipstick - featured, bestseller
  insert into public.products (name, description, category_id, brand, price, previous_price, stock_qty, status, is_featured, is_new, is_bestseller)
  values ('أحمر شفاه مات - روزة', 'أحمر شفاه بثبات عالٍ ولون غني يدوم 12 ساعة، خالي من الجفاف وغني بزبدة الشيا.', v_lip, 'Queen Beauty', 15000, 22000, 25, 'available', true, false, true)
  returning id into p;
  insert into public.product_images (product_id, url, sort_order, is_primary) values
    (p, 'https://images.pexels.com/photos/7664873/pexels-photo-7664873.jpeg?auto=compress&cs=tinysrgb&h=800&w=800', 1, true),
    (p, 'https://images.pexels.com/photos/7810602/pexels-photo-7810602.jpeg?auto=compress&cs=tinysrgb&h=800&w=800', 2, false),
    (p, 'https://images.pexels.com/photos/25533521/pexels-photo-25533521.jpeg?auto=compress&cs=tinysrgb&h=800&w=800', 3, false);

  -- 2. Lipstick set - new
  insert into public.products (name, description, category_id, brand, price, stock_qty, status, is_featured, is_new, is_bestseller)
  values ('طقم أحمر شفاه 5 ألوان', 'طقم أحمر شفاه بـ5 درجات راقية لكل المناسبات، تغطية مات فاخرة.', v_lip, 'Queen Beauty', 35000, 15, 'available', false, true, false)
  returning id into p;
  insert into public.product_images (product_id, url, sort_order, is_primary) values
    (p, 'https://images.pexels.com/photos/25533534/pexels-photo-25533534.jpeg?auto=compress&cs=tinysrgb&h=800&w=800', 1, true),
    (p, 'https://images.pexels.com/photos/6527701/pexels-photo-6527701.jpeg?auto=compress&cs=tinysrgb&h=800&w=800', 2, false);

  -- 3. Perfume - featured, bestseller, discount
  insert into public.products (name, description, category_id, brand, price, previous_price, stock_qty, status, is_featured, is_new, is_bestseller)
  values ('عطر الملكة الذهبي', 'عطر شرقي فاخر بمزيج العود والورد والمسك، يدوم طويلاً ويناسب المناسبات الرسمية.', v_perf, 'Royal Oud', 65000, 85000, 10, 'available', true, false, true)
  returning id into p;
  insert into public.product_images (product_id, url, sort_order, is_primary) values
    (p, 'https://images.pexels.com/photos/12456276/pexels-photo-12456276.jpeg?auto=compress&cs=tinysrgb&h=800&w=800', 1, true),
    (p, 'https://images.pexels.com/photos/12456259/pexels-photo-12456259.jpeg?auto=compress&cs=tinysrgb&h=800&w=800', 2, false),
    (p, 'https://images.pexels.com/photos/11482448/pexels-photo-11482448.jpeg?auto=compress&cs=tinysrgb&h=800&w=800', 3, false);

  -- 4. Perfume - new
  insert into public.products (name, description, category_id, brand, price, stock_qty, status, is_featured, is_new, is_bestseller)
  values ('عطر ليلة بغداد', 'عطر أنثوي ناعم بنفحات الفانيليا والياسمين، مثالي للاستعمال اليومي.', v_perf, 'Royal Oud', 42000, 20, 'available', false, true, false)
  returning id into p;
  insert into public.product_images (product_id, url, sort_order, is_primary) values
    (p, 'https://images.pexels.com/photos/12456283/pexels-photo-12456283.jpeg?auto=compress&cs=tinysrgb&h=800&w=800', 1, true),
    (p, 'https://images.pexels.com/photos/12456275/pexels-photo-12456275.jpeg?auto=compress&cs=tinysrgb&h=800&w=800', 2, false);

  -- 5. Skincare cream - featured
  insert into public.products (name, description, category_id, brand, price, previous_price, stock_qty, status, is_featured, is_new, is_bestseller)
  values ('كريم ترطيب البشرة - فيتامين C', 'كريم ترطيب يومي بفيتامين C يوحّد لون البشرة ويمنحها نضارة طبيعية.', v_skin, 'Glow Lab', 28000, 34000, 30, 'available', true, false, false)
  returning id into p;
  insert into public.product_images (product_id, url, sort_order, is_primary) values
    (p, 'https://images.pexels.com/photos/4173450/pexels-photo-4173450.jpeg?auto=compress&cs=tinysrgb&h=800&w=800', 1, true),
    (p, 'https://images.pexels.com/photos/4841234/pexels-photo-4841234.jpeg?auto=compress&cs=tinysrgb&h=800&w=800', 2, false),
    (p, 'https://images.pexels.com/photos/5911998/pexels-photo-5911998.jpeg?auto=compress&cs=tinysrgb&h=800&w=800', 3, false);

  -- 6. Skincare - out of stock
  insert into public.products (name, description, category_id, brand, price, stock_qty, status, is_featured, is_new, is_bestseller)
  values ('ماسك تنظيف عميق بالطين', 'ماسك أسبوعي بالطين المغربي ينظف المسام بعمق ويعيد التوازن للبشرة الدهنية.', v_skin, 'Glow Lab', 18000, 0, 'out_of_stock', false, false, false)
  returning id into p;
  insert into public.product_images (product_id, url, sort_order, is_primary) values
    (p, 'https://images.pexels.com/photos/19644201/pexels-photo-19644201.jpeg?auto=compress&cs=tinysrgb&h=800&w=800', 1, true);

  -- 7. Haircare - bestseller
  insert into public.products (name, description, category_id, brand, price, stock_qty, status, is_featured, is_new, is_bestseller)
  values ('شامبو وبلسم الكيراتين', 'ثنائي شامبو وبلسم بالكيراتين يغذي الشعر التالف ويمنحه لمعاناً ونعومة.', v_hair, 'Silk Hair', 24000, 18, 'available', false, false, true)
  returning id into p;
  insert into public.product_images (product_id, url, sort_order, is_primary) values
    (p, 'https://images.pexels.com/photos/33525723/pexels-photo-33525723.jpeg?auto=compress&cs=tinysrgb&h=800&w=800', 1, true),
    (p, 'https://images.pexels.com/photos/19833253/pexels-photo-19833253.jpeg?auto=compress&cs=tinysrgb&h=800&w=800', 2, false);

  -- 8. Makeup palette - new, featured
  insert into public.products (name, description, category_id, brand, price, previous_price, stock_qty, status, is_featured, is_new, is_bestseller)
  values ('باليت ظلال العيون - 12 لون', 'باليت ظلال عيون بـ12 درجة بين المات واللامع، تثبت طويلاً و blended سهل.', v_make, 'Queen Beauty', 30000, 38000, 22, 'available', true, true, false)
  returning id into p;
  insert into public.product_images (product_id, url, sort_order, is_primary) values
    (p, 'https://images.pexels.com/photos/3689976/pexels-photo-3689976.jpeg?auto=compress&cs=tinysrgb&h=800&w=800', 1, true),
    (p, 'https://images.pexels.com/photos/15657763/pexels-photo-15657763.jpeg?auto=compress&cs=tinysrgb&h=800&w=800', 2, false);

  -- 9. Draft product (should be hidden from storefront)
  insert into public.products (name, description, category_id, brand, price, stock_qty, status, is_featured, is_new, is_bestseller)
  values ('منتج قيد التحضير - سيlaunch قريباً', 'هذا منتج تجريبي لم يكتمل بعد، يجب ألا يظهر في المتجر.', v_perf, 'Royal Oud', 50000, 5, 'draft', false, false, false)
  returning id into p;
  insert into public.product_images (product_id, url, sort_order, is_primary) values
    (p, 'https://images.pexels.com/photos/12456272/pexels-photo-12456272.jpeg?auto=compress&cs=tinysrgb&h=800&w=800', 1, true);
end;
$$;
