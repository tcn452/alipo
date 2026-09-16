create or replace function private.prepare_fuel_report()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.expires_at := new.created_at + interval '12 hours';
  return new;
end;
$$;

update public.fuel_reports
set expires_at = created_at + interval '12 hours'
where expires_at <> created_at + interval '12 hours';

create or replace function private.expire_stale_reports()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  delete from public.fuel_reports where expires_at <= now();
  get diagnostics deleted_count = row_count;

  update public.stations s
  set petrol_status = coalesce((select r.status from public.fuel_reports r where r.station_id = s.id and r.is_active and r.expires_at > now() and r.fuel_type in ('petrol', 'both') order by r.created_at desc limit 1), 'unknown'::public.fuel_status),
      diesel_status = coalesce((select r.status from public.fuel_reports r where r.station_id = s.id and r.is_active and r.expires_at > now() and r.fuel_type in ('diesel', 'both') order by r.created_at desc limit 1), 'unknown'::public.fuel_status),
      petrol_reported_at = (select r.created_at from public.fuel_reports r where r.station_id = s.id and r.is_active and r.expires_at > now() and r.fuel_type in ('petrol', 'both') order by r.created_at desc limit 1),
      diesel_reported_at = (select r.created_at from public.fuel_reports r where r.station_id = s.id and r.is_active and r.expires_at > now() and r.fuel_type in ('diesel', 'both') order by r.created_at desc limit 1),
      latest_status = coalesce((select r.status from public.fuel_reports r where r.station_id = s.id and r.is_active and r.expires_at > now() order by r.created_at desc limit 1), 'unknown'::public.fuel_status),
      latest_queue = (select r.queue_estimate from public.fuel_reports r where r.station_id = s.id and r.is_active and r.expires_at > now() order by r.created_at desc limit 1),
      last_reported_at = (select r.created_at from public.fuel_reports r where r.station_id = s.id and r.is_active and r.expires_at > now() order by r.created_at desc limit 1);

  return deleted_count;
end;
$$;
