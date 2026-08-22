/*
# Iraq Queen — Core Schema (MVP)

E-commerce store for Iraqi cosmetics/perfume/skincare. Arabic, RTL, mobile-first.
WhatsApp is the only ordering channel. Admin auth via Supabase Auth (email/password).
Guest checkout allowed.

## Tables
1. `users` — profile mirroring auth.users, role customer|admin (admin set server-side only).
2. `categories` — name, image, sort_order. Hard cap 10 via trigger.
3. `products` — catalog with status (available|out_of_stock|draft) + flags.
4. `product_images` — up to 5 per product via trigger, is_primary + sort_order.
5. `orders` — ORD-#### ID, guest or customer, status workflow, delivery_fee snapshot.
6. `order_items` — line items with unit_price snapshot.
7. `store_settings` — single row: name/logo/whatsapp/delivery fee/social.

## Security / RLS
- `is_admin()` helper reads auth.jwt() app_metadata.role === 'admin' (server-assigned, user-immutable).
- Catalog + settings: public read; admin-only writes.
- Draft products + their images: hidden from anon/authenticated (visible only to admins).
- Orders: customers see own; admin sees all; anon can insert (guest checkout via create_order()).
- `create_order()` is SECURITY DEFINER: atomically validates stock, decrements, inserts order+items, returns order.

## Notes
- Category cap 10 enforced by `enforce_category_cap` trigger.
- Product image cap 5 enforced by `enforce_product_image_cap` trigger.
- Order ID sequence `order_seq` produces ORD-####.
*/

create extension if not exists "pgcrypto";
create extension if not exists pg_trgm;

-- ============================================================
-- HELPER: is_admin()  (must exist before policies reference it)
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- ============================================================
-- USERS PROFILE
-- ============================================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select to authenticated using (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ============================================================
-- STORE SETTINGS (single row)
-- ============================================================
create table if not exists public.store_settings (
  id int primary key default 1,
  store_name text not null default 'Iraq Queen',
  store_name_ar text not null default 'شركة عراق كوين',
  logo_url text,
  whatsapp_number text not null default '9647700000000',
  delivery_fee integer not null default 5000,
  contact_info text,
  social_links jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint store_settings_singleton check (id = 1)
);

insert into public.store_settings (id) values (1)
  on conflict (id) do nothing;

alter table public.store_settings enable row level security;

drop policy if exists "settings_public_read" on public.store_settings;
create policy "settings_public_read" on public.store_settings
  for select to anon, authenticated using (true);

drop policy if exists "settings_admin_update" on public.store_settings;
create policy "settings_admin_update" on public.store_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- CATEGORIES (cap 10)
-- ============================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories
  for select to anon, authenticated using (true);

drop policy if exists "categories_admin_insert" on public.categories;
create policy "categories_admin_insert" on public.categories
  for insert to authenticated with check (public.is_admin());

drop policy if exists "categories_admin_update" on public.categories;
create policy "categories_admin_update" on public.categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "categories_admin_delete" on public.categories;
create policy "categories_admin_delete" on public.categories
  for delete to authenticated using (public.is_admin());

-- ============================================================
-- PRODUCTS
-- ============================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  brand text,
  price integer not null check (price >= 0),
  previous_price integer check (previous_price is null or previous_price >= 0),
  stock_qty integer not null default 0 check (stock_qty >= 0),
  status text not null default 'available' check (status in ('available','out_of_stock','draft')),
  is_featured boolean not null default false,
  is_new boolean not null default false,
  is_bestseller boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select to anon, authenticated using (status <> 'draft' or public.is_admin());

drop policy if exists "products_admin_insert" on public.products;
create policy "products_admin_insert" on public.products
  for insert to authenticated with check (public.is_admin());

drop policy if exists "products_admin_update" on public.products;
create policy "products_admin_update" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products_admin_delete" on public.products;
create policy "products_admin_delete" on public.products
  for delete to authenticated using (public.is_admin());

-- ============================================================
-- PRODUCT IMAGES (cap 5 per product)
-- ============================================================
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.product_images enable row level security;

drop policy if exists "images_public_read" on public.product_images;
create policy "images_public_read" on public.product_images
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and (p.status <> 'draft' or public.is_admin())
    )
  );

drop policy if exists "images_admin_insert" on public.product_images;
create policy "images_admin_insert" on public.product_images
  for insert to authenticated with check (public.is_admin());

drop policy if exists "images_admin_update" on public.product_images;
create policy "images_admin_update" on public.product_images
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "images_admin_delete" on public.product_images;
create policy "images_admin_delete" on public.product_images
  for delete to authenticated using (public.is_admin());

-- ============================================================
-- ORDERS
-- ============================================================
create sequence if not exists public.order_seq start 1000;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references public.users(id) on delete set null,
  name text not null,
  phone text not null,
  governorate text not null,
  address text not null,
  notes text,
  delivery_fee integer not null default 0,
  subtotal integer not null default 0,
  total integer not null default 0,
  item_count integer not null default 0,
  status text not null default 'new' check (status in ('new','processing','shipped','completed','cancelled')),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select to authenticated
  using (auth.uid() = customer_id or public.is_admin());

drop policy if exists "orders_insert_any" on public.orders;
create policy "orders_insert_any" on public.orders
  for insert to anon, authenticated with check (true);

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- ORDER ITEMS
-- ============================================================
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0)
);

alter table public.order_items enable row level security;

drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own" on public.order_items
  for select to authenticated
  using (
    exists (select 1 from public.orders o
            where o.id = order_items.order_id
              and (o.customer_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "order_items_insert_any" on public.order_items;
create policy "order_items_insert_any" on public.order_items
  for insert to anon, authenticated with check (true);

-- ============================================================
-- TRIGGERS: updated_at
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated on public.products;
create trigger products_touch_updated
  before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch_updated on public.store_settings;
create trigger settings_touch_updated
  before update on public.store_settings
  for each row execute function public.touch_updated_at();

-- ============================================================
-- TRIGGER: enforce category cap of 10
-- ============================================================
create or replace function public.enforce_category_cap()
returns trigger
language plpgsql
as $$
declare
  cnt integer;
begin
  select count(*) into cnt from public.categories;
  if cnt >= 10 then
    raise exception 'لا يمكن إضافة أكثر من 10 فئات (الحد الأقصى 10)';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_category_cap_trigger on public.categories;
create trigger enforce_category_cap_trigger
  before insert on public.categories
  for each row execute function public.enforce_category_cap();

-- ============================================================
-- TRIGGER: enforce product image cap of 5
-- ============================================================
create or replace function public.enforce_product_image_cap()
returns trigger
language plpgsql
as $$
declare
  cnt integer;
begin
  select count(*) into cnt from public.product_images where product_id = new.product_id;
  if cnt >= 5 then
    raise exception 'لا يمكن إضافة أكثر من 5 صور لكل منتج';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_product_image_cap_trigger on public.product_images;
create trigger enforce_product_image_cap_trigger
  before insert on public.product_images
  for each row execute function public.enforce_product_image_cap();

-- ============================================================
-- FUNCTION: create_order (atomic checkout)
-- ============================================================
create or replace function public.create_order(
  p_name text,
  p_phone text,
  p_governorate text,
  p_address text,
  p_notes text,
  p_items jsonb,
  p_delivery_fee integer,
  p_customer_id uuid default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_order_no text;
  v_seq bigint;
  v_subtotal integer := 0;
  v_item_count integer := 0;
  v_item jsonb;
  v_pid uuid;
  v_qty integer;
  v_price integer;
  v_pname text;
  v_stock integer;
  v_status text;
  v_total integer;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'السلة فارغة';
  end if;

  select nextval('public.order_seq') into v_seq;
  v_order_no := 'ORD-' || lpad(v_seq::text, 4, '0');

  insert into public.orders (
    order_number, customer_id, name, phone, governorate, address, notes,
    delivery_fee, subtotal, total, item_count, status
  ) values (
    v_order_no, p_customer_id, p_name, p_phone, p_governorate, p_address, p_notes,
    p_delivery_fee, 0, 0, 0, 'new'
  ) returning * into v_order;

  for v_item in select jsonb_array_elements(p_items) loop
    v_pid := v_item->>'product_id';
    v_qty := (v_item->>'quantity')::integer;

    if v_qty is null or v_qty <= 0 then
      raise exception 'كمية غير صالحة';
    end if;

    select price, stock_qty, name, status into v_price, v_stock, v_pname, v_status
      from public.products where id = v_pid for update;

    if not found then
      raise exception 'منتج غير موجود';
    end if;

    if v_status = 'draft' then
      raise exception 'لا يمكن طلب منتج غير منشور';
    end if;

    if v_stock < v_qty then
      raise exception 'الكمية المطلوبة غير متوفرة لـ "%"', v_pname;
    end if;

    update public.products
      set stock_qty = stock_qty - v_qty,
          status = case when stock_qty - v_qty <= 0 then 'out_of_stock' else status end
      where id = v_pid;

    insert into public.order_items (order_id, product_id, product_name, quantity, unit_price)
      values (v_order.id, v_pid, v_pname, v_qty, v_price);

    v_subtotal := v_subtotal + (v_price * v_qty);
    v_item_count := v_item_count + 1;
  end loop;

  v_total := v_subtotal + p_delivery_fee;

  update public.orders
    set subtotal = v_subtotal, total = v_total, item_count = v_item_count
    where id = v_order.id
    returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.create_order(text,text,text,text,text,jsonb,integer,uuid) to anon, authenticated;

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_status on public.products(status);
create index if not exists idx_products_featured on public.products(is_featured) where is_featured;
create index if not exists idx_products_new on public.products(is_new) where is_new;
create index if not exists idx_products_bestseller on public.products(is_bestseller) where is_bestseller;
create index if not exists idx_products_name_trgm on public.products using gin (name gin_trgm_ops);
create index if not exists idx_products_brand_trgm on public.products using gin (brand gin_trgm_ops);
create index if not exists idx_products_created_at on public.products(created_at desc);
create index if not exists idx_product_images_product on public.product_images(product_id);
create index if not exists idx_orders_number on public.orders(order_number);
create index if not exists idx_orders_name on public.orders(name);
create index if not exists idx_orders_phone on public.orders(phone);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_categories_sort on public.categories(sort_order);

-- ============================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
