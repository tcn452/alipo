create table public.community_station_submissions (
  id bigint generated always as identity primary key,
  station_id uuid not null references public.stations(id) on delete cascade,
  reporter_fingerprint text not null,
  reported_accuracy_m numeric(8,2),
  created_at timestamptz not null default now()
);

create index community_station_submissions_station_id_idx
  on public.community_station_submissions (station_id);

alter table public.community_station_submissions enable row level security;
revoke all on table public.community_station_submissions from public, anon, authenticated;
grant all on table public.community_station_submissions to service_role;

create function public.create_community_station(
  p_name text,
  p_brand text,
  p_city text,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m double precision,
  p_reporter_fingerprint text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_location extensions.geography;
  v_station_id uuid;
begin
  if char_length(trim(p_name)) < 2 or char_length(trim(p_name)) > 200 then
    raise exception 'Enter a station name between 2 and 200 characters.';
  end if;
  if length(p_reporter_fingerprint) < 32 then raise exception 'A valid reporter fingerprint is required.'; end if;
  if p_latitude not between -17.2 and -9.2 or p_longitude not between 32.6 and 35.95 then
    raise exception 'The submitted location must be in Malawi.';
  end if;
  if p_accuracy_m is null or p_accuracy_m > 200 then
    raise exception 'Location accuracy must be within 200 metres.';
  end if;

  v_location := extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography;
  if exists (select 1 from public.stations where active and extensions.st_dwithin(location, v_location, 75)) then
    raise exception 'An existing station is within 75 metres.';
  end if;

  insert into public.stations (name, brand, location, city, verified, active)
  values (trim(p_name), coalesce(nullif(trim(p_brand), ''), 'Independent'), v_location, nullif(trim(p_city), ''), false, true)
  returning id into v_station_id;

  insert into public.community_station_submissions (station_id, reporter_fingerprint, reported_accuracy_m)
  values (v_station_id, p_reporter_fingerprint, p_accuracy_m);

  insert into public.station_sources (source, source_record_id, station_id, source_name, source_city, source_location, metadata)
  values ('community', v_station_id::text, v_station_id, trim(p_name), nullif(trim(p_city), ''), v_location,
    jsonb_build_object('match_type', 'on_site_submission', 'reported_accuracy_m', p_accuracy_m));

  return v_station_id;
end;
$$;

revoke all on function public.create_community_station(text,text,text,double precision,double precision,double precision,text)
  from public, anon, authenticated;
grant execute on function public.create_community_station(text,text,text,double precision,double precision,double precision,text)
  to service_role;
