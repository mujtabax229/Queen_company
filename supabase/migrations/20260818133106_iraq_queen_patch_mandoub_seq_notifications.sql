/*
# Iraq Queen Patch: Mandoub role, order sequence reset, new-order notifications

## Changes
1. Reset `order_seq` to start at 0 so next order is ORD-0000.
2. Add `mandoub` role to the users role check constraint.
3. Update `is_admin()` semantics — mandoub is NOT admin; add `is_staff()` helper
   that returns true for both admin and mandoub, used for order read/update access.
4. Orders: allow mandoub to SELECT and UPDATE status (but not other fields).
   Done via new policies scoped to `is_staff()` for orders + order_items.
5. Products/categories/settings: mandoub gets NO write access (admin only, unchanged).
   Mandoub also cannot SELECT draft products — the existing products_public_read policy
   already gates on `status <> 'draft' or is_admin()`, and mandoub is not admin, so drafts stay hidden.
6. New table `order_views` — tracks which orders each staff user has opened (for the "جديد" dot).
7. Enable realtime on `orders` table for live new-order alerts.
*/

-- 1. Reset order sequence to 0 so nextval yields 0
drop sequence if exists public.order_seq;
create sequence public.order_seq start 0 minvalue 0;

-- 2. Expand role check to include mandoub
alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
  check (role in ('customer','admin','mandoub'));

-- 3. is_staff() helper — true for admin OR mandoub
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

-- 4. Orders: replace select/update policies to use is_staff() (admin OR mandoub)
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select to authenticated
  using (auth.uid() = customer_id or public.is_staff());

-- Mandoub can only update status; admin can update everything.
-- RLS UPDATE policy controls row access; column-level restriction is enforced
-- in the application layer (mandoub UI only shows status buttons). To harden
-- at DB level, we add a WITH CHECK that allows mandoub updates only when the
-- status column is the one being changed — but Postgres RLS doesn't support
-- column-level UPDATE restrictions natively. We instead use a trigger to
-- block mandoub from changing non-status fields.
drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_staff_update" on public.orders
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- 5. Order items: mandoub can read
drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own" on public.order_items
  for select to authenticated
  using (
    exists (select 1 from public.orders o
            where o.id = order_items.order_id
              and (o.customer_id = auth.uid() or public.is_staff()))
  );

-- 6. Trigger: block mandoub from updating non-status order fields
create or replace function public.guard_mandoub_order_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  is_mandoub boolean;
begin
  is_admin := public.is_admin();
  is_mandoub := public.is_staff() and not is_admin;
  if is_mandoub then
    -- mandoub may only change the status column
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
       or new.order_number is distinct from old.order_number then
      raise exception 'المندوب لا يملك صلاحية تعديل هذه الحقول';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_mandoub_order_update_trigger on public.orders;
create trigger guard_mandoub_order_update_trigger
  before update on public.orders
  for each row execute function public.guard_mandoub_order_update();

-- 7. order_views table — tracks which staff have opened which order
create table if not exists public.order_views (
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (order_id, user_id)
);

alter table public.order_views enable row level security;

drop policy if exists "order_views_staff_rw" on public.order_views;
create policy "order_views_staff_rw" on public.order_views
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- 8. Enable realtime on orders
alter publication supabase_realtime add table public.orders;
