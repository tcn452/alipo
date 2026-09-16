create schema if not exists extensions;
create schema if not exists private;
create extension if not exists postgis with schema extensions;
create type public.user_role as enum ('consumer', 'station_attendant', 'fleet_admin', 'fleet_dispatcher', 'fleet_driver', 'wekode_ops');
create type public.company_type as enum ('logistics', 'ngo', 'delivery', 'government', 'other');
create type public.billing_status as enum ('trial', 'active', 'overdue', 'cancelled');
create type public.company_plan as enum ('starter', 'growth', 'fleet');
create type public.fuel_status as enum ('available', 'low', 'out', 'unknown');
create type public.queue_estimate as enum ('none', 'short', 'medium', 'long');
create type public.fuel_type as enum ('petrol', 'diesel', 'both');
create type public.report_source as enum ('ussd', 'whatsapp', 'web', 'verified_station');
create type public.fraud_flag_type as enum ('impossible_travel', 'consumption_spike', 'frequency_anomaly');
create type public.flag_severity as enum ('low', 'medium', 'high');
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  type public.company_type not null default 'other',
  billing_status public.billing_status not null default 'trial',
  plan public.company_plan not null default 'starter',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  name text check (name is null or char_length(name) <= 120),
  phone text,
  role public.user_role not null default 'consumer',
  trust_score smallint not null default 0 check (trust_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.stations (
  id uuid primary key default gen_random_uuid(),
  osm_type text check (osm_type in ('node', 'way', 'relation')),
  osm_id bigint,
  name text not null check (char_length(name) between 1 and 200),
  brand text not null default 'Independent',
  location extensions.geography(point, 4326) not null,
  district text,
  city text,
  address text,
  verified boolean not null default false,
  fuel_types public.fuel_type[] not null default array['petrol'::public.fuel_type, 'diesel'::public.fuel_type],
  contact_phone text,
  latest_status public.fuel_status not null default 'unknown',
  latest_queue public.queue_estimate,
  last_reported_at timestamptz,
  osm_synced_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stations_osm_identity unique (osm_type, osm_id),
  constraint stations_fuel_types_valid check (
    cardinality(fuel_types) > 0
    and fuel_types <@ array['petrol'::public.fuel_type, 'diesel'::public.fuel_type]
  )
);
create table public.fuel_reports (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete restrict,
  reporter_id uuid references auth.users(id) on delete set null,
  reporter_phone_hash text,
  status public.fuel_status not null check (status <> 'unknown'),
  fuel_type public.fuel_type not null,
  queue_estimate public.queue_estimate,
  source public.report_source not null default 'web',
  confirmations integer not null default 1 check (confirmations >= 0),
  confidence numeric(4,3) not null default 0.500 check (confidence between 0 and 1),
  is_active boolean not null default true,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  plate text not null,
  assigned_driver_id uuid references auth.users(id) on delete set null,
  assigned_driver_name text,
  assigned_driver_phone text,
  fuel_card_id text,
  fuel_type public.fuel_type not null check (fuel_type <> 'both'),
  tank_capacity_litres numeric(8,2) check (tank_capacity_litres is null or tank_capacity_litres > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicles_company_plate_unique unique (company_id, plate)
);
create table public.fuel_allocations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  allocated_litres numeric(10,2) not null check (allocated_litres >= 0),
  consumed_litres numeric(10,2) not null default 0 check (consumed_litres >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fuel_allocations_period_valid check (period_end >= period_start),
  constraint fuel_allocations_vehicle_period_unique unique (vehicle_id, period_start, period_end)
);
create table public.refuel_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  station_id uuid references public.stations(id) on delete set null,
  reported_by uuid references auth.users(id) on delete set null,
  litres numeric(10,2) not null check (litres > 0),
  cost_mwk numeric(14,2) check (cost_mwk is null or cost_mwk >= 0),
  odometer_km numeric(12,1) check (odometer_km is null or odometer_km >= 0),
  created_at timestamptz not null default now()
);
create table public.fraud_flags (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  refuel_event_id uuid references public.refuel_events(id) on delete set null,
  flag_type public.fraud_flag_type not null,
  severity public.flag_severity not null,
  detail text not null,
  resolved boolean not null default false,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint fraud_flags_resolution_valid check ((not resolved and resolved_at is null) or resolved)
);
create index stations_location_gix on public.stations using gist (location);
create index stations_city_active_idx on public.stations (city) where active;
create index stations_status_active_idx on public.stations (latest_status) where active;
create index fuel_reports_station_created_idx on public.fuel_reports (station_id, created_at desc);
create index fuel_reports_active_expiry_idx on public.fuel_reports (expires_at) where is_active;
create index profiles_company_idx on public.profiles (company_id) where company_id is not null;
create index vehicles_company_idx on public.vehicles (company_id) where active;
create index fuel_allocations_company_period_idx on public.fuel_allocations (company_id, period_start, period_end);
create index refuel_events_company_created_idx on public.refuel_events (company_id, created_at desc);
create index refuel_events_vehicle_created_idx on public.refuel_events (vehicle_id, created_at desc);
create index fraud_flags_company_open_idx on public.fraud_flags (company_id, created_at desc) where not resolved;
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger companies_set_updated_at before update on public.companies for each row execute function private.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger stations_set_updated_at before update on public.stations for each row execute function private.set_updated_at();
create trigger vehicles_set_updated_at before update on public.vehicles for each row execute function private.set_updated_at();
create trigger fuel_allocations_set_updated_at before update on public.fuel_allocations for each row execute function private.set_updated_at();
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, phone)
  values (new.id, nullif(new.raw_user_meta_data ->> 'name', ''), new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();
create function private.is_ops()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role' = 'wekode_ops'), false)
$$;
create function private.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select company_id from public.profiles where id = (select auth.uid())
$$;
create function private.is_company_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('fleet_admin', 'fleet_dispatcher', 'wekode_ops')
  )
$$;
create function private.prepare_fuel_report()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.expires_at := new.created_at + case when new.status = 'out' then interval '6 hours' else interval '3 hours' end;
  return new;
end;
$$;
create trigger fuel_reports_prepare
before insert on public.fuel_reports
for each row execute function private.prepare_fuel_report();
create function private.apply_fuel_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.stations
  set latest_status = new.status,
      latest_queue = new.queue_estimate,
      last_reported_at = new.created_at
  where id = new.station_id;
  return new;
end;
$$;
create trigger fuel_reports_apply_status
after insert on public.fuel_reports
for each row execute function private.apply_fuel_report();
create function private.expire_stale_reports()
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

  with latest as (
    select distinct on (r.station_id)
      r.station_id, r.status, r.queue_estimate, r.created_at
    from public.fuel_reports r
    where r.is_active and r.expires_at > now()
    order by r.station_id, r.created_at desc
  )
  update public.stations s
  set latest_status = coalesce(latest.status, 'unknown'::public.fuel_status),
      latest_queue = latest.queue_estimate,
      last_reported_at = latest.created_at
  from latest
  where s.id = latest.station_id;

  update public.stations s
  set latest_status = 'unknown', latest_queue = null
  where s.latest_status <> 'unknown'
    and not exists (
      select 1 from public.fuel_reports r
      where r.station_id = s.id and r.is_active and r.expires_at > now()
    );

  return expired_count;
end;
$$;
create function public.nearby_stations(p_latitude double precision, p_longitude double precision, p_radius_km double precision default 10)
returns table (
  id uuid,
  name text,
  brand text,
  latitude double precision,
  longitude double precision,
  district text,
  city text,
  verified boolean,
  fuel_types public.fuel_type[],
  latest_status public.fuel_status,
  latest_queue public.queue_estimate,
  last_reported_at timestamptz,
  distance_km double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    s.id,
    s.name,
    s.brand,
    extensions.st_y(s.location::extensions.geometry) as latitude,
    extensions.st_x(s.location::extensions.geometry) as longitude,
    s.district,
    s.city,
    s.verified,
    s.fuel_types,
    s.latest_status,
    s.latest_queue,
    s.last_reported_at,
    extensions.st_distance(
      s.location,
      extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography
    ) / 1000.0 as distance_km
  from public.stations s
  where s.active
    and extensions.st_dwithin(
      s.location,
      extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography,
      least(greatest(p_radius_km, 1), 50) * 1000
    )
  order by distance_km;
$$;
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.stations enable row level security;
alter table public.fuel_reports enable row level security;
alter table public.vehicles enable row level security;
alter table public.fuel_allocations enable row level security;
alter table public.refuel_events enable row level security;
alter table public.fraud_flags enable row level security;
create policy "stations are publicly readable" on public.stations for select to anon, authenticated using (active);
create policy "ops manage stations" on public.stations for all to authenticated using ((select private.is_ops())) with check ((select private.is_ops()));
create policy "anonymous users submit web reports" on public.fuel_reports for insert to anon
with check (reporter_id is null and source = 'web');
create policy "authenticated users submit their own web reports" on public.fuel_reports for insert to authenticated
with check (reporter_id = (select auth.uid()) and source = 'web');
create policy "users read their own reports" on public.fuel_reports for select to authenticated
using (reporter_id = (select auth.uid()) or (select private.is_ops()));
create policy "ops manage reports" on public.fuel_reports for update to authenticated
using ((select private.is_ops())) with check ((select private.is_ops()));
create policy "ops delete reports" on public.fuel_reports for delete to authenticated using ((select private.is_ops()));
create policy "users read their profile" on public.profiles for select to authenticated using (id = (select auth.uid()) or (select private.is_ops()));
create policy "users update their profile" on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "company members read company" on public.companies for select to authenticated
using (id = (select private.current_company_id()) or (select private.is_ops()));
create policy "ops manage companies" on public.companies for all to authenticated
using ((select private.is_ops())) with check ((select private.is_ops()));
create policy "company members read vehicles" on public.vehicles for select to authenticated
using (company_id = (select private.current_company_id()) or (select private.is_ops()));
create policy "company managers create vehicles" on public.vehicles for insert to authenticated
with check ((company_id = (select private.current_company_id()) and (select private.is_company_manager())) or (select private.is_ops()));
create policy "company managers update vehicles" on public.vehicles for update to authenticated
using ((company_id = (select private.current_company_id()) and (select private.is_company_manager())) or (select private.is_ops()))
with check ((company_id = (select private.current_company_id()) and (select private.is_company_manager())) or (select private.is_ops()));
create policy "company managers delete vehicles" on public.vehicles for delete to authenticated
using ((company_id = (select private.current_company_id()) and (select private.is_company_manager())) or (select private.is_ops()));
create policy "company members read allocations" on public.fuel_allocations for select to authenticated
using (company_id = (select private.current_company_id()) or (select private.is_ops()));
create policy "company managers manage allocations" on public.fuel_allocations for all to authenticated
using ((company_id = (select private.current_company_id()) and (select private.is_company_manager())) or (select private.is_ops()))
with check ((company_id = (select private.current_company_id()) and (select private.is_company_manager())) or (select private.is_ops()));
create policy "company members read refuels" on public.refuel_events for select to authenticated
using (company_id = (select private.current_company_id()) or (select private.is_ops()));
create policy "company members create own refuels" on public.refuel_events for insert to authenticated
with check (
  company_id = (select private.current_company_id())
  and reported_by = (select auth.uid())
);
create policy "company managers update refuels" on public.refuel_events for update to authenticated
using ((company_id = (select private.current_company_id()) and (select private.is_company_manager())) or (select private.is_ops()))
with check ((company_id = (select private.current_company_id()) and (select private.is_company_manager())) or (select private.is_ops()));
create policy "company managers delete refuels" on public.refuel_events for delete to authenticated
using ((company_id = (select private.current_company_id()) and (select private.is_company_manager())) or (select private.is_ops()));
create policy "company members read flags" on public.fraud_flags for select to authenticated
using (company_id = (select private.current_company_id()) or (select private.is_ops()));
create policy "company managers update flags" on public.fraud_flags for update to authenticated
using ((company_id = (select private.current_company_id()) and (select private.is_company_manager())) or (select private.is_ops()))
with check ((company_id = (select private.current_company_id()) and (select private.is_company_manager())) or (select private.is_ops()));
revoke all on all tables in schema public from anon, authenticated;
grant select on public.stations to anon, authenticated;
grant insert on public.fuel_reports to anon, authenticated;
grant select on public.fuel_reports to authenticated;
grant select on public.profiles, public.companies, public.vehicles, public.fuel_allocations, public.refuel_events, public.fraud_flags to authenticated;
grant update (name) on public.profiles to authenticated;
grant insert, update, delete on public.companies, public.stations, public.vehicles, public.fuel_allocations, public.refuel_events, public.fraud_flags to authenticated;
grant update, delete on public.fuel_reports to authenticated;
grant usage on schema private to anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_ops() to anon, authenticated;
grant execute on function private.current_company_id() to authenticated;
grant execute on function private.is_company_manager() to authenticated;
grant execute on function public.nearby_stations(double precision, double precision, double precision) to anon, authenticated;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'stations'
  ) then
    alter publication supabase_realtime add table public.stations;
  end if;
end
$$;
