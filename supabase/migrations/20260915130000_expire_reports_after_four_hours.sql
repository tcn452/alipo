create extension if not exists pg_cron;

create or replace function private.prepare_fuel_report()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.expires_at := new.created_at + interval '4 hours';
  return new;
end;
$$;

update public.fuel_reports
set expires_at = created_at + interval '4 hours';

select private.expire_stale_reports();

select cron.schedule(
  'expire-stale-fuel-reports',
  '*/5 * * * *',
  'select private.expire_stale_reports()'
)
where not exists (
  select 1 from cron.job where jobname = 'expire-stale-fuel-reports'
);

