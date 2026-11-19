-- Agenda o lembrete de 24h (send-reminders) de hora em hora via pg_cron + pg_net.
-- O valor real do Bearer já foi aplicado direto no banco (não fica em texto puro
-- aqui no repo). Se precisar recriar o job, troque SEU_CRON_SECRET_AQUI pelo
-- mesmo valor configurado como secret CRON_SECRET da edge function send-reminders.
create extension if not exists pg_net;

select cron.schedule(
  'send-reminders-24h',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://gwtohygukijsdvksgsik.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer SEU_CRON_SECRET_AQUI', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
