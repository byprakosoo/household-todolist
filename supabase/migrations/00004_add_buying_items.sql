-- ============================================================
-- Household To Do List: Shared Buying List
-- Run this in Supabase SQL Editor
-- ============================================================

create table if not exists public.buying_items (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid references public.households(id) on delete cascade not null,
  created_by    uuid,
  name          text not null,
  quantity      text,
  is_bought     boolean default false not null,
  bought_at     timestamptz,
  sort_order    int default 0 not null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  constraint chk_buying_item_name_length check (char_length(trim(name)) between 1 and 120),
  constraint chk_buying_item_quantity_length check (quantity is null or char_length(quantity) <= 50)
);

create index if not exists idx_buying_items_household
  on public.buying_items(household_id);

create index if not exists idx_buying_items_household_state_order
  on public.buying_items(household_id, is_bought, sort_order, created_at);

drop trigger if exists trg_buying_items_updated_at on public.buying_items;
create trigger trg_buying_items_updated_at
  before update on public.buying_items
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on table public.buying_items to anon, authenticated;

alter table public.buying_items disable row level security;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'buying_items'
  ) then
    alter publication supabase_realtime add table public.buying_items;
  end if;
end;
$$;
