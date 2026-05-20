-- ============================================================
-- WeekSync: Initial Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
create extension if not exists "pg_cron";
create extension if not exists "pg_net";

-- ============================================================
-- 2. TABLES
-- ============================================================

-- users: mirrors auth.users, stores display name + avatar color
create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  display_name  text,
  avatar_color  text default '#FF6B6B',
  created_at    timestamptz default now()
);

-- households: one per couple
create table if not exists public.households (
  id                  uuid primary key default gen_random_uuid(),
  invite_code         text unique,
  rollover_confirmed  boolean default false,
  confirmed_week      int,
  confirmed_year      int,
  created_at          timestamptz default now()
);

-- household_members: junction table, max 2 per household
create table if not exists public.household_members (
  household_id  uuid references public.households(id) on delete cascade,
  user_id       uuid references public.users(id) on delete cascade,
  joined_at     timestamptz default now(),
  primary key (household_id, user_id)
);

-- task_categories: household-scoped labels
create table if not exists public.task_categories (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid references public.households(id) on delete cascade not null,
  name          text not null,
  color_hex     text not null,
  emoji         text,
  sort_order    int default 0,
  deleted_at    timestamptz,
  created_at    timestamptz default now(),
  constraint chk_color_hex check (
    color_hex in (
      '#EF4444','#F97316','#EAB308','#22C55E',
      '#06B6D4','#3B82F6','#6366F1','#A855F7',
      '#EC4899','#78716C','#84CC16','#14B8A6'
    )
  ),
  constraint chk_name_length check (char_length(name) <= 30)
);

-- tasks: core entity
create table if not exists public.tasks (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid references public.households(id) on delete cascade not null,
  created_by      uuid references public.users(id) on delete set null,
  assigned_to     uuid references public.users(id) on delete set null,
  category_id     uuid references public.task_categories(id) on delete set null,
  title           text not null,
  notes           text,
  assignee_type   text not null,
  is_done         boolean default false,
  week_number     int not null,
  year            int not null,
  sort_order      int default 0,
  rolled_over_from uuid references public.tasks(id) on delete set null,
  completed_at    timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  constraint chk_assignee_type check (assignee_type in ('me','partner','both')),
  constraint chk_notes_length check (char_length(notes) <= 500)
);

-- ============================================================
-- 3. INDEXES
-- ============================================================

create index if not exists idx_tasks_household_week
  on tasks(household_id, year, week_number);

create index if not exists idx_tasks_rolled_from
  on tasks(rolled_over_from) where rolled_over_from is not null;

create index if not exists idx_tasks_household_year
  on tasks(household_id, year);

create index if not exists idx_tasks_category
  on tasks(category_id) where category_id is not null;

create index if not exists idx_categories_household_active
  on task_categories(household_id) where deleted_at is null;

create index if not exists idx_household_members_user
  on household_members(user_id);

-- ============================================================
-- 4. FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create users row when auth.users gets a new signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Generate a random 6-char uppercase invite code
create or replace function public.generate_invite_code()
returns text as $$
declare
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$ language plpgsql volatile;

-- Auto-set invite code on household creation
create or replace function public.set_household_invite_code()
returns trigger as $$
begin
  if new.invite_code is null then
    loop
      new.invite_code := public.generate_invite_code();
      begin
        -- try update (will fail if duplicate and retry)
        return new;
      exception when unique_violation then
        -- collision, retry
      end;
    end loop;
  end if;
  return new;
end;
$$ language plpgsql volatile security definer;

drop trigger if exists trg_household_invite_code on public.households;
create trigger trg_household_invite_code
  before insert on public.households
  for each row execute function public.set_household_invite_code();

-- Enforce max 2 members per household
create or replace function public.check_member_limit()
returns trigger as $$
declare
  member_count int;
begin
  select count(*) into member_count
  from public.household_members
  where household_id = new.household_id;

  if member_count >= 2 then
    raise exception 'Household is full (max 2 members)';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_enforce_member_limit on public.household_members;
create trigger trg_enforce_member_limit
  before insert on public.household_members
  for each row execute function public.check_member_limit();

-- Enforce max 20 active categories per household
create or replace function public.check_category_limit()
returns trigger as $$
declare
  cat_count int;
begin
  select count(*) into cat_count
  from public.task_categories
  where household_id = new.household_id and deleted_at is null;

  if cat_count >= 20 then
    raise exception 'Category limit of 20 reached for this household';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_enforce_category_limit on public.task_categories;
create trigger trg_enforce_category_limit
  before insert on public.task_categories
  for each row execute function public.check_category_limit();

-- Seed 4 default categories on household creation
create or replace function public.seed_default_categories()
returns trigger as $$
begin
  insert into public.task_categories (household_id, name, color_hex, emoji, sort_order)
  values
    (new.id, 'Home',      '#22C55E', '🏠', 1),
    (new.id, 'Groceries', '#EAB308', '🛒', 2),
    (new.id, 'Work',      '#3B82F6', '💼', 3),
    (new.id, 'Personal',  '#EC4899', '🙋', 4);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_seed_categories on public.households;
create trigger trg_seed_categories
  after insert on public.households
  for each row execute function public.seed_default_categories();

-- Auto-update updated_at on tasks
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

alter table public.users enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.task_categories enable row level security;
alter table public.tasks enable row level security;

-- Helper: get user's household_id
create or replace function public.get_my_household()
returns uuid as $$
  select household_id from public.household_members where user_id = auth.uid()
$$ language sql stable security definer;

-- users: can read own + partner's profile
drop policy if exists "users_read_own_household" on public.users;
create policy "users_read_own_household" on public.users
  for select using (
    id = auth.uid()
    or id in (
      select user_id from public.household_members
      where household_id = public.get_my_household()
    )
  );

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (id = auth.uid());

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own" on public.users
  for insert with check (id = auth.uid());

-- households: allow lookup by invite code (for joining), modify by members only
drop policy if exists "households_select" on public.households;
create policy "households_select" on public.households
  for select using (true);

drop policy if exists "households_insert" on public.households;
create policy "households_insert" on public.households
  for insert with check (true);

drop policy if exists "households_update" on public.households;
create policy "households_update" on public.households
  for update using (id = public.get_my_household());

drop policy if exists "households_delete" on public.households;
create policy "households_delete" on public.households
  for delete using (id = public.get_my_household());

-- household_members: members only for reads, allow self-insert for joining
drop policy if exists "hm_select" on public.household_members;
create policy "hm_select" on public.household_members
  for select using (
    household_id = public.get_my_household()
    or user_id = auth.uid()
  );

drop policy if exists "hm_insert" on public.household_members;
create policy "hm_insert" on public.household_members
  for insert with check (
    user_id = auth.uid()
  );

drop policy if exists "hm_delete" on public.household_members;
create policy "hm_delete" on public.household_members
  for delete using (
    household_id = public.get_my_household()
  );

-- task_categories: household members only
drop policy if exists "categories_members_only" on public.task_categories;
create policy "categories_members_only" on public.task_categories
  for all using (
    household_id = public.get_my_household()
  );

-- tasks: household members only
drop policy if exists "tasks_members_only" on public.tasks;
create policy "tasks_members_only" on public.tasks
  for all using (
    household_id = public.get_my_household()
  );

-- ============================================================
-- 6. REALTIME
-- ============================================================

-- Enable realtime on tasks table (ignore if already added)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'task_categories'
  ) then
    alter publication supabase_realtime add table public.task_categories;
  end if;
end;
$$;
