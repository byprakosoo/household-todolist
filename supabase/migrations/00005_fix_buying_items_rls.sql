-- ============================================================
-- Household To Do List: Buying List RLS Fix
-- Run this in Supabase SQL Editor if buying item inserts fail with RLS errors
-- ============================================================

grant select, insert, update, delete on table public.buying_items to anon, authenticated;

alter table public.buying_items enable row level security;

drop policy if exists "buying_items_no_auth_select" on public.buying_items;
create policy "buying_items_no_auth_select" on public.buying_items
  for select
  using (household_id = '10000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "buying_items_no_auth_insert" on public.buying_items;
create policy "buying_items_no_auth_insert" on public.buying_items
  for insert
  with check (household_id = '10000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "buying_items_no_auth_update" on public.buying_items;
create policy "buying_items_no_auth_update" on public.buying_items
  for update
  using (household_id = '10000000-0000-0000-0000-000000000001'::uuid)
  with check (household_id = '10000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "buying_items_no_auth_delete" on public.buying_items;
create policy "buying_items_no_auth_delete" on public.buying_items
  for delete
  using (household_id = '10000000-0000-0000-0000-000000000001'::uuid);
