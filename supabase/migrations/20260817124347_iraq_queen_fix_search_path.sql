/*
# Tighten function search_path

Sets an explicit `public` search_path on the three trigger functions that were
flagged with mutable search_path: touch_updated_at, enforce_category_cap,
enforce_product_image_cap. No behavior change.
*/

alter function public.touch_updated_at() set search_path = public;
alter function public.enforce_category_cap() set search_path = public;
alter function public.enforce_product_image_cap() set search_path = public;
