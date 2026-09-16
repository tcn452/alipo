create function public.all_stations()
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
  last_reported_at timestamptz
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
    s.last_reported_at
  from public.stations s
  where s.active
  order by s.city, s.name;
$$;
revoke all on function public.all_stations() from public;
grant execute on function public.all_stations() to anon, authenticated;
