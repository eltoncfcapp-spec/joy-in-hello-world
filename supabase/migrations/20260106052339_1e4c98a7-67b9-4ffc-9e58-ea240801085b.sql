-- Enable required extensions for cron scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule event reminders to run daily at 7:00 AM
SELECT cron.schedule(
  'daily-event-reminders',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zvwotqerxmohasszzybs.supabase.co/functions/v1/event-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2d290cWVyeG1vaGFzc3p6eWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Mzc2MjUsImV4cCI6MjA3NzUxMzYyNX0.2aaNglmJ2s-z8nnv0TPWBcawx4xSioldmKzCvjUlqaA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);