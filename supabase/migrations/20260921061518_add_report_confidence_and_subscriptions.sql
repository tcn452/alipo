alter table public.stations
  add column petrol_confidence numeric(4, 3) not null default 0 check (petrol_confidence between 0 and 1),
  add column diesel_confidence numeric(4, 3) not null default 0 check (diesel_confidence between 0 and 1),
  add column petrol_confirmations integer not null default 0 check (petrol_confirmations >= 0),
  add column diesel_confirmations integer not null default 0 check (diesel_confirmations >= 0);

create table public.report_confirmations (
  report_id uuid not null references public.fuel_reports(id) on delete cascade,
  reporter_fingerprint text not null check (char_length(reporter_fingerprint) = 64),
  created_at timestamptz not null default now(),
  primary key (report_id, reporter_fingerprint)
);

create index report_confirmations_created_idx on public.report_confirmations (created_at desc);
alter table public.report_confirmations enable row level security;
revoke all on table public.report_confirmations from anon, authenticated;

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
      diesel_reported_at = case when new.fuel_type in ('diesel', 'both') then new.created_at else diesel_reported_at end,
      petrol_confidence = case when new.fuel_type in ('petrol', 'both') then new.confidence else petrol_confidence end,
      diesel_confidence = case when new.fuel_type in ('diesel', 'both') then new.confidence else diesel_confidence end,
      petrol_confirmations = case when new.fuel_type in ('petrol', 'both') then new.confirmations else petrol_confirmations end,
      diesel_confirmations = case when new.fuel_type in ('diesel', 'both') then new.confirmations else diesel_confirmations end
  where id = new.station_id;
  return new;
end;
$$;

drop function public.nearby_stations(double precision, double precision, double precision);
create function public.nearby_stations(p_latitude double precision, p_longitude double precision, p_radius_km double precision default 10)
returns table (id uuid, name text, brand text, latitude double precision, longitude double precision, district text, city text, verified boolean, fuel_types public.fuel_type[], latest_status public.fuel_status, latest_queue public.queue_estimate, last_reported_at timestamptz, petrol_status public.fuel_status, diesel_status public.fuel_status, petrol_reported_at timestamptz, diesel_reported_at timestamptz, petrol_confidence numeric, diesel_confidence numeric, petrol_confirmations integer, diesel_confirmations integer, distance_km double precision)
language sql stable security invoker set search_path = '' as $$
  select s.id, s.name, s.brand, extensions.st_y(s.location::extensions.geometry), extensions.st_x(s.location::extensions.geometry), s.district, s.city, s.verified, s.fuel_types, s.latest_status, s.latest_queue, s.last_reported_at, s.petrol_status, s.diesel_status, s.petrol_reported_at, s.diesel_reported_at, s.petrol_confidence, s.diesel_confidence, s.petrol_confirmations, s.diesel_confirmations,
    extensions.st_distance(s.location, extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography) / 1000.0
  from public.stations s where s.active and extensions.st_dwithin(s.location, extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography, least(greatest(p_radius_km, 1), 50) * 1000)
  order by 21;
$$;
revoke all on function public.nearby_stations(double precision, double precision, double precision) from public;
grant execute on function public.nearby_stations(double precision, double precision, double precision) to anon, authenticated;

drop function public.all_stations();
create function public.all_stations()
returns table (id uuid, name text, brand text, latitude double precision, longitude double precision, district text, city text, verified boolean, fuel_types public.fuel_type[], latest_status public.fuel_status, latest_queue public.queue_estimate, last_reported_at timestamptz, petrol_status public.fuel_status, diesel_status public.fuel_status, petrol_reported_at timestamptz, diesel_reported_at timestamptz, petrol_confidence numeric, diesel_confidence numeric, petrol_confirmations integer, diesel_confirmations integer, distance_km double precision)
language sql stable security invoker set search_path = '' as $$
  select s.id, s.name, s.brand, extensions.st_y(s.location::extensions.geometry), extensions.st_x(s.location::extensions.geometry), s.district, s.city, s.verified, s.fuel_types, s.latest_status, s.latest_queue, s.last_reported_at, s.petrol_status, s.diesel_status, s.petrol_reported_at, s.diesel_reported_at, s.petrol_confidence, s.diesel_confidence, s.petrol_confirmations, s.diesel_confirmations, null::double precision
  from public.stations s where s.active order by s.city nulls last, s.name;
$$;
revoke all on function public.all_stations() from public;
grant execute on function public.all_stations() to anon, authenticated;
