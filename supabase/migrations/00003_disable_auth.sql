-- ============================================================
-- WeekSync: Remove authentication requirement
-- Run this in Supabase SQL Editor
-- ============================================================

-- Disable RLS on all tables so anon key can read/write without auth
alter table public.users disable row level security;
alter table public.households disable row level security;
alter table public.household_members disable row level security;
alter table public.task_categories disable row level security;
alter table public.tasks disable row level security;

-- Drop auth users trigger (no longer needed)
drop trigger if exists on_auth_user_created on auth.users;

-- Drop FK constraints from tasks so we can store any UUID
alter table public.tasks drop constraint if exists tasks_created_by_fkey;
alter table public.tasks drop constraint if exists tasks_assigned_to_fkey;

-- Drop FK from users to auth.users so we can insert public users directly
alter table public.users drop constraint if exists users_id_fkey;

-- Create default household
insert into public.households (id, invite_code)
values ('10000000-0000-0000-0000-000000000001', 'WKSYNC')
on conflict (id) do nothing;

-- Create default users
insert into public.users (id, email, display_name, avatar_color)
values ('20000000-0000-0000-0000-000000000001', 'me@weeksync.local', 'Me', '#3B82F6')
on conflict (id) do nothing;

insert into public.users (id, email, display_name, avatar_color)
values ('20000000-0000-0000-0000-000000000002', 'partner@weeksync.local', 'Partner', '#EC4899')
on conflict (id) do nothing;

-- Link default users to default household
insert into public.household_members (household_id, user_id)
values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001')
on conflict do nothing;

insert into public.household_members (household_id, user_id)
values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002')
on conflict do nothing;
