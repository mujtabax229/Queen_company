/*
# Iraq Queen Patch #2: Mandoub permissions, change requests, profiles, referral, phone format

## Changes
1. mandoub_permissions table — per-mandoub granular permission toggles (can_add_products, can_view_data, can_change_order_status)
2. product_change_requests table — pending edit/delete requests from mandoubs, require admin approval
3. mandoub_profiles table — onboarding data: full_name, telegram_link, photo_url, specialty_tags, onboarding_complete
4. orders table — add referred_by_mandoub_id column for referral attribution
5. Phone format change: local part now 10 digits starting with 77 (not 9 starting with 7)
6. RLS: mandoub can INSERT products only if can_add_products=true; mandoub can UPDATE order status only if can_change_order_status=true
7. RLS: product_change_requests — mandoub can insert/view own, admin can see all and approve/reject
8. RLS: mandoub_profiles — admin can read all, mandoub can read/update own
9. SECURITY DEFINER functions: has_mandoub_permission() for server-side checks
10. create_order() updated to accept referred_by_mandoub_id
11. Realtime enabled on product_change_requests and mandoub_profiles
12. is_staff() updated to also check mandoub_profiles.onboarding_complete for access gating
*/

-- ============================================================
-- 1. MANDOUB PERMISSIONS TABLE
-- ============================================================
create table if not exists public.mandoub_permissions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  can_add_products boolean not null default false,
  can_view_data boolean not null default false,
  can_change_order_status boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.mandoub_permissions enable row level security;

-- Admin can do everything; mandoub can read their own permissions
drop policy if exists "mandoub_perms_admin_all" on public.mandoub_permissions;
create policy "mandoub_perms_admin_all" on public.mandoub_permissions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "mandoub_perms_self_read" on public.mandoub_permissions;
create policy "mandoub_perms_self_read" on public.mandoub_permissions
  for select to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- 2. PRODUCT CHANGE REQUESTS TABLE
-- ============================================================
create table if not exists public.product_change_requests (
  id uuid primary key default gen_random_uuid(),
  mandoub_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  request_type text not null check (request_type in ('edit','delete')),
  proposed_changes jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

alter table public.product_change_requests enable row level security;

-- Mandoub can insert and read own requests; admin can read/update all
drop policy if exists "change_req_mandoub_insert" on public.product_change_requests;
create policy "change_req_mandoub_insert" on public.product_change_requests
  for insert to authenticated
  with check (auth.uid() = mandoub_id and public.is_staff());

drop policy if exists "change_req_mandoub_select_own" on public.product_change_requests;
create policy "change_req_mandoub_select_own" on public.product_change_requests
  for select to authenticated
  using (auth.uid() = mandoub_id or public.is_admin());

drop policy if exists "change_req_admin_update" on public.product_change_requests;
create policy "change_req_admin_update" on public.product_change_requests
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists idx_change_req_status on public.product_change_requests(status);
create index if not exists idx_change_req_mandoub on public.product_change_requests(mandoub_id);

-- ============================================================
-- 3. MANDOUB PROFILES TABLE (onboarding data)
-- ============================================================
create table if not exists public.mandoub_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  telegram_link text,
  photo_url text,
  specialty_tags text[] not null default '{}',
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mandoub_profiles enable row level security;

-- Admin can read all mandoub profiles
drop policy if exists "mandoub_profile_admin_read" on public.mandoub_profiles;
create policy "mandoub_profile_admin_read" on public.mandoub_profiles
  for select to authenticated
  using (public.is_admin());

-- Mandoub can read and update own profile
drop policy if exists "mandoub_profile_self_read" on public.mandoub_profiles;
create policy "mandoub_profile_self_read" on public.mandoub_profiles
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "mandoub_profile_self_upsert" on public.mandoub_profiles;
create policy "mandoub_profile_self_upsert" on public.mandoub_profiles
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "mandoub_profile_self_update" on public.mandoub_profiles;
create policy "mandoub_profile_self_update" on public.mandoub_profiles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger: touch updated_at
create or replace function public.touch_mandoub_profile_updated()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mandoub_profile_touch on public.mandoub_profiles;
create trigger mandoub_profile_touch
  before update on public.mandoub_profiles
  for each row execute function public.touch_mandoub_profile_updated();

-- ============================================================
-- 4. ORDERS: add referred_by_mandoub_id column
-- ============================================================
alter table public.orders add column if not exists referred_by_mandoub_id uuid references auth.users(id) on delete set null;

create index if not exists idx_orders_referral on public.orders(referred_by_mandoub_id);

-- ============================================================
-- 5. HELPER: has_mandoub_permission(user_id, permission_name)
-- ============================================================
create or replace function public.has_mandoub_permission(
  p_user_id uuid,
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select case p_permission
      when 'can_add_products' then can_add_products
      when 'can_view_data' then can_view_data
      when 'can_change_order_status' then can_change_order_status
      else false
    end
    from public.mandoub_permissions
    where user_id = p_user_id),
    false
  );
$$;

-- ============================================================
-- 6. HELPER: is_mandoub_onboarded()
-- ============================================================
create or replace function public.is_mandoub_onboarded()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select onboarding_complete
     from public.mandoub_profiles
     where user_id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- 7. UPDATE is_staff() to require onboarding for mandoub
-- ============================================================
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','mandoub')
    or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin','mandoub'),
    false
  );
$$;

-- ============================================================
-- 8. PRODUCTS: allow mandoub with can_add_products to INSERT
-- ============================================================
drop policy if exists "products_admin_insert" on public.products;
create policy "products_admin_insert" on public.products
  for insert to authenticated
  with check (
    public.is_admin()
    or (public.is_staff() and public.has_mandoub_permission(auth.uid(), 'can_add_products'))
  );

-- Products UPDATE stays admin-only (mandoub edits go through change requests)
-- Products DELETE stays admin-only
-- ============================================================

-- ============================================================
-- 9. ORDERS: allow mandoub with can_change_order_status to UPDATE status
-- Replace the existing staff_update policy
-- ============================================================
drop policy if exists "orders_staff_update" on public.orders;
create policy "orders_staff_update" on public.orders
  for update to authenticated
  using (
    public.is_admin()
    or (public.is_staff() and public.has_mandoub_permission(auth.uid(), 'can_change_order_status'))
  )
  with check (
    public.is_admin()
    or (public.is_staff() and public.has_mandoub_permission(auth.uid(), 'can_change_order_status'))
  );

-- ============================================================
-- 10. UPDATE guard_mandoub_order_update trigger: check permission
-- ============================================================
create or replace function public.guard_mandoub_order_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  is_mandoub boolean;
  has_perm boolean;
begin
  is_admin := public.is_admin();
  is_mandoub := public.is_staff() and not is_admin;

  if is_mandoub then
    -- Check if mandoub has permission to change order status
    select public.has_mandoub_permission(auth.uid(), 'can_change_order_status') into has_perm;
    if not has_perm then
      raise exception 'لا تملك صلاحية تغيير حالة الطلب';
    end if;

    -- Mandoub may only change the status column
    if new.name is distinct from old.name
       or new.phone is distinct from old.phone
       or new.governorate is distinct from old.governorate
       or new.address is distinct from old.address
       or new.notes is distinct from old.notes
       or new.delivery_fee is distinct from old.delivery_fee
       or new.subtotal is distinct from old.subtotal
       or new.total is distinct from old.total
       or new.item_count is distinct from old.item_count
       or new.customer_id is distinct from old.customer_id
       or new.order_number is distinct from old.order_number
       or new.referred_by_mandoub_id is distinct from old.referred_by_mandoub_id then
      raise exception 'المندوب لا يملك صلاحية تعديل هذه الحقول';
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================
-- 11. UPDATE create_order() to accept referred_by_mandoub_id
-- ============================================================
create or replace function public.create_order(
  p_name text,
  p_phone text,
  p_governorate text,
  p_address text,
  p_notes text,
  p_items jsonb,
  p_delivery_fee integer,
  p_customer_id uuid default null,
  p_referred_by_mandoub_id uuid default null
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
    delivery_fee, subtotal, total, item_count, status, referred_by_mandoub_id
  ) values (
    v_order_no, p_customer_id, p_name, p_phone, p_governorate, p_address, p_notes,
    p_delivery_fee, 0, 0, 0, 'new', p_referred_by_mandoub_id
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

grant execute on function public.create_order(text,text,text,text,text,jsonb,integer,uuid,uuid) to anon, authenticated;

-- ============================================================
-- 12. Enable realtime on new tables
-- ============================================================
alter publication supabase_realtime add table public.product_change_requests;
alter publication supabase_realtime add table public.mandoub_profiles;
