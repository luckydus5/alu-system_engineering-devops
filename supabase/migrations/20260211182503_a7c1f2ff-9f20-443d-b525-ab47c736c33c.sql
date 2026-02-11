
SELECT cron.schedule(
  'daily-leave-balance-deduction',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url:='https://edumcnnilpnbdxcjpchw.supabase.co/functions/v1/leave-balance-cron',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdW1jbm5pbHBuYmR4Y2pwY2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMzI1ODEsImV4cCI6MjA4MjkwODU4MX0.nRPDvserHqLnNx78UArKHuzJp5J4C0-FT9noHtmXfFU"}'::jsonb,
    body:='{"time": "daily"}'::jsonb
  ) AS request_id;
  $$
);
