create unique index if not exists idx_tasks_unique_rollover_target
  on public.tasks(household_id, year, week_number, rolled_over_from)
  where rolled_over_from is not null;
