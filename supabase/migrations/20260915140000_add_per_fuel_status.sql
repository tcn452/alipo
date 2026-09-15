alter table public.stations
  add column petrol_status public.fuel_status not null default 'unknown',
  add column diesel_status public.fuel_status not null default 'unknown',
  add column petrol_reported_at timestamptz,
  add column diesel_reported_at timestamptz;

update public.stations s
set petrol_status = coalesce((
      select r.status from public.fuel_reports r
      where r.station_id = s.id and r.is_active and r.expires_at > now()
        and r.fuel_type in ('petrol', 'both')
      order by r.created_at desc limit 1
    ), 'unknown'::public.fuel_status),
    diesel_status = coalesce((
      select r.status from public.fuel_reports r
      where r.station_id = s.id and r.is_active and r.expires_at > now()
        and r.fuel_type in ('diesel', 'both')
      order by r.created_at desc limit 1
    ), 'unknown'::public.fuel_status),
    petrol_reported_at = (
      select r.created_at from public.fuel_reports r
      where r.station_id = s.id and r.is_active and r.expires_at > now()
        and r.fuel_type in ('petrol', 'both')
      order by r.created_at desc limit 1
    ),
    diesel_reported_at = (
      select r.created_at from public.fuel_reports r
      where r.station_id = s.id and r.is_active and r.expires_at > now()
        and r.fuel_type in ('diesel', 'both')
      order by r.created_at desc limit 1
    );

create or replace function private.apply_fuel_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.stations
  set latest_status = new.status,
      latest_queue = new.queue_estimate,
      last_reported_at = new.created_at,
      petrol_status = case when new.fuel_type in ('petrol', 'both') then new.status else petrol_status end,
      diesel_status = case when new.fuel_type in ('diesel', 'both') then new.status else diesel_status end,
      petrol_reported_at = case when new.fuel_type in ('petrol', 'both') then new.created_at else petrol_reported_at end,
      diesel_reported_at = case when new.fuel_type in ('diesel', 'both') then new.created_at else diesel_reported_at end
  where id = new.station_id;
  return new;
end;
$$;

create or replace function private.expire_stale_reports()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_count integer;
begin
  update public.fuel_reports set is_active = false where is_active and expires_at <= now();
  get diagnostics expired_count = row_count;

  update public.stations s
  set petrol_status = coalesce((select r.status from public.fuel_reports r where r.station_id = s.id and r.is_active and r.expires_at > now() and r.fuel_type in ('petrol', 'both') order by r.created_at desc limit 1), 'unknown'::public.fuel_status),
      diesel_status = coalesce((select r.status from public.fuel_reports r where r.station_id = s.id and r.is_active and r.expires_at > now() and r.fuel_type in ('diesel', 'both') order by r.created_at desc limit 1), 'unknown'::public.fuel_status),
      petrol_reported_at = (select r.created_at from public.fuel_reports r where r.station_id = s.id and r.is_active and r.expires_at > now() and r.fuel_type in ('petrol', 'both') order by r.created_at desc limit 1),
      diesel_reported_at = (select r.created_at from public.fuel_reports r where r.station_id = s.id and r.is_active and r.expires_at > now() and r.fuel_type in ('diesel', 'both') order by r.created_at desc limit 1),
      latest_status = coalesce((select r.status from public.fuel_reports r where r.station_id = s.id and r.is_active and r.expires_at > now() order by r.created_at desc limit 1), 'unknown'::public.fuel_status),
      latest_queue = (select r.queue_estimate from public.fuel_reports r where r.station_id = s.id and r.is_active and r.expires_at > now() order by r.created_at desc limit 1),
      last_reported_at = (select r.created_at from public.fuel_reports r where r.station_id = s.id and r.is_active and r.expires_at > now() order by r.created_at desc limit 1);

  return expired_count;
end;
$$;

drop function public.nearby_stations(double precision, double precision, double precision);
create function public.nearby_stations(p_latitude double precision, p_longitude double precision, p_radius_km double precision default 10)
returns table (id uuid, name text, brand text, latitude double precision, longitude double precision, district text, city text, verified boolean, fuel_types public.fuel_type[], latest_status public.fuel_status, latest_queue public.queue_estimate, last_reported_at timestamptz, petrol_status public.fuel_status, diesel_status public.fuel_status, petrol_reported_at timestamptz, diesel_reported_at timestamptz, distance_km double precision)
language sql stable security invoker set search_path = '' as $$
  select s.id, s.name, s.brand, extensions.st_y(s.location::extensions.geometry), extensions.st_x(s.location::extensions.geometry), s.district, s.city, s.verified, s.fuel_types, s.latest_status, s.latest_queue, s.last_reported_at, s.petrol_status, s.diesel_status, s.petrol_reported_at, s.diesel_reported_at,
    extensions.st_distance(s.location, extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography) / 1000.0
  from public.stations s where s.active and extensions.st_dwithin(s.location, extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography, least(greatest(p_radius_km, 1), 50) * 1000)
  order by 17;
$$;
revoke all on function public.nearby_stations(double precision, double precision, double precision) from public;
grant execute on function public.nearby_stations(double precision, double precision, double precision) to anon, authenticated;

drop function public.all_stations();
create function public.all_stations()
returns table (id uuid, name text, brand text, latitude double precision, longitude double precision, district text, city text, verified boolean, fuel_types public.fuel_type[], latest_status public.fuel_status, latest_queue public.queue_estimate, last_reported_at timestamptz, petrol_status public.fuel_status, diesel_status public.fuel_status, petrol_reported_at timestamptz, diesel_reported_at timestamptz, distance_km double precision)
language sql stable security invoker set search_path = '' as $$
  select s.id, s.name, s.brand, extensions.st_y(s.location::extensions.geometry), extensions.st_x(s.location::extensions.geometry), s.district, s.city, s.verified, s.fuel_types, s.latest_status, s.latest_queue, s.last_reported_at, s.petrol_status, s.diesel_status, s.petrol_reported_at, s.diesel_reported_at, null::double precision
  from public.stations s where s.active order by s.city nulls last, s.name;
$$;
revoke all on function public.all_stations() from public;
grant execute on function public.all_stations() to anon, authenticated;
