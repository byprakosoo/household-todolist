-- ============================================================
-- WeekSync: Cron Job Setup
-- Run AFTER deploying the edge function (supabase functions deploy rollover-reminder)
-- Replace PROJECT_REF with your Supabase project reference ID
-- ============================================================

select cron.schedule(
  'weekly-rollover-reminder',           -- job name
  '0 13 * * 0',                          -- Sunday 13:00 UTC (20:00 UTC+7)
  $$
  select net.http_post(
    url:='https://PROJECT_REF.supabase.co/functions/v1/rollover-reminder',
    headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);
