-- pg_net was introduced only for this dispatcher. Reinstall its extension
-- metadata outside the exposed public schema; its API remains in net.
drop extension pg_net;
create extension pg_net with schema extensions;

-- Use the canonical host directly: cross-host redirects strip Authorization.
select cron.schedule(
  'alipo-fuel-alert-dispatch',
  '* * * * *',
  $dispatch$
    select net.http_get(
      url := 'https://www.alipo.co.mw/api/push/dispatch',
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
