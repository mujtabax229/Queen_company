/*
# Create product-images storage bucket

- Public bucket `product-images` for product and category images.
- Public read (anon + authenticated).
- Admin-only write (insert/update/delete) via is_admin() check.
*/

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Public read
drop policy if exists "images_bucket_read" on storage.objects;
create policy "images_bucket_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-images');

-- Admin write
drop policy if exists "images_bucket_insert" on storage.objects;
create policy "images_bucket_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "images_bucket_update" on storage.objects;
create policy "images_bucket_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "images_bucket_delete" on storage.objects;
create policy "images_bucket_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
