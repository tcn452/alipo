-- Supabase runs the schedule; no Vercel Cron or paid Vercel plan is required.
-- Provision alipo_fuel_alert_cron_secret in Vault separately; never commit it.
create extension if not exists pg_net;

select cron.schedule(
  'alipo-fuel-alert-dispatch',
  '* * * * *',
  $dispatch$
    select net.http_get(
      url := 'https://alipo.co.mw/api/push/dispatch',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'alipo_fuel_alert_cron_secret'
        )
      ),
      timeout_milliseconds := 55000
    ) as request_id
    where exists (
      select 1 from public.fuel_push_subscriptions
      where cardinality(station_ids) > 0 and lease_until < now()
    ) and exists (
      select 1 from vault.secrets where name = 'alipo_fuel_alert_cron_secret'
    );
  $dispatch$
);
