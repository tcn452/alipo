create table public.station_location_votes (
  station_id uuid not null references public.stations(id) on delete cascade,
  reporter_fingerprint text not null,
  created_at timestamptz not null default now(),
  primary key(station_id, reporter_fingerprint)
);
alter table public.station_location_votes enable row level security;
revoke all on public.station_location_votes from public, anon, authenticated;
grant select, insert on public.station_location_votes to service_role;

create function public.submit_station_location_vote(p_station_id uuid, p_latitude double precision, p_longitude double precision, p_accuracy double precision, p_fingerprint text)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare s public.stations%rowtype; votes bigint;
begin
  select * into s from public.stations where id=p_station_id and active for update;
  if not found then raise exception 'Station not found'; end if;
  if p_accuracy is null or p_accuracy < 0 or p_accuracy > 100 or p_latitude is null or p_longitude is null
    or not extensions.st_dwithin(s.location, extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography,150)
    then raise exception 'Confirm while at the station with accurate location enabled'; end if;
  if p_fingerprint is null or length(p_fingerprint)<32 then raise exception 'Valid voter required'; end if;
  -- Do not let the submitter verify their own pin.
  if exists(select 1 from public.community_station_submissions c where c.station_id=p_station_id and c.reporter_fingerprint=p_fingerprint) then raise exception 'Another visitor must confirm this location'; end if;
  insert into public.station_location_votes values(p_station_id,p_fingerprint,now()) on conflict do nothing;
  select count(*) into votes from public.station_location_votes v where v.station_id=p_station_id;
  if votes>=2 then update public.stations set verified=true,updated_at=now() where id=p_station_id; end if;
  return votes;
end;
$$;
revoke all on function public.submit_station_location_vote(uuid,double precision,double precision,double precision,text) from public,anon,authenticated;
grant execute on function public.submit_station_location_vote(uuid,double precision,double precision,double precision,text) to service_role;

-- Address submissions carry no GPS accuracy claim and remain unverified.
create function public.create_address_station(p_name text,p_brand text,p_city text,p_address text,p_latitude double precision,p_longitude double precision,p_fingerprint text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare pin extensions.geography; station uuid;
begin
  if p_name is null or length(trim(p_name)) not between 2 and 200 or p_address is null or length(trim(p_address)) not between 5 and 500
    or p_fingerprint is null or length(p_fingerprint)<32 then raise exception 'Valid station, address and reporter required'; end if;
  if p_latitude is null or p_longitude is null or p_latitude not between -17.2 and -9.2 or p_longitude not between 32.6 and 35.95 then raise exception 'Location must be in Malawi'; end if;
  pin:=extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography;
  if exists(select 1 from public.stations where active and extensions.st_dwithin(location,pin,75)) then raise exception 'An existing station is within 75 metres'; end if;
  insert into public.stations(name,brand,city,address,location,verified,active) values(trim(p_name),coalesce(nullif(trim(p_brand),''),'Independent'),nullif(trim(p_city),''),trim(p_address),pin,false,true) returning id into station;
  insert into public.community_station_submissions(station_id,reporter_fingerprint,reported_accuracy_m) values(station,p_fingerprint,null);
  return station;
end;
$$;
revoke all on function public.create_address_station(text,text,text,text,double precision,double precision,text) from public,anon,authenticated;
grant execute on function public.create_address_station(text,text,text,text,double precision,double precision,text) to service_role;
