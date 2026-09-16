alter table public.station_geocoding_candidates
  add column reviewed_by uuid references auth.users(id) on delete set null;

create index station_geocoding_candidates_reviewer_idx
  on public.station_geocoding_candidates (reviewed_by)
  where reviewed_by is not null;

create table public.station_candidate_reviews (
  id bigint generated always as identity primary key,
  candidate_id bigint not null references public.station_geocoding_candidates(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('accept', 'reject', 'create')),
  station_id uuid references public.stations(id) on delete set null,
  created_at timestamptz not null default now()
);

create index station_candidate_reviews_candidate_idx
  on public.station_candidate_reviews (candidate_id, created_at desc);

create index station_candidate_reviews_reviewer_idx
  on public.station_candidate_reviews (reviewer_id, created_at desc);

alter table public.station_candidate_reviews enable row level security;
revoke all on table public.station_candidate_reviews from anon, authenticated;
revoke all on sequence public.station_candidate_reviews_id_seq from anon, authenticated;
grant all on table public.station_candidate_reviews to service_role;
grant usage, select on sequence public.station_candidate_reviews_id_seq to service_role;

create policy "service role manages candidate reviews"
  on public.station_candidate_reviews
  for all to service_role
  using (true) with check (true);

create function public.station_candidate_review_queue()
returns table (
  id bigint,
  source text,
  source_record_id text,
  operator_name text,
  source_name text,
  source_city text,
  source_address text,
  provider text,
  result_name text,
  result_address text,
  confidence_score smallint,
  evidence jsonb,
  latitude double precision,
  longitude double precision,
  nearest_station_id uuid,
  nearest_station_name text,
  nearest_station_brand text,
  nearest_station_distance_m double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id, c.source, c.source_record_id, c.operator_name, c.source_name,
    c.source_city, c.source_address, c.provider, c.result_name,
    c.result_address, c.confidence_score, c.evidence,
    extensions.st_y(c.proposed_location::extensions.geometry),
    extensions.st_x(c.proposed_location::extensions.geometry),
    nearest.id, nearest.name, nearest.brand,
    extensions.st_distance(c.proposed_location, nearest.location)
  from public.station_geocoding_candidates c
  cross join lateral (
    select s.id, s.name, s.brand, s.location
    from public.stations s
    where s.active = true
    order by extensions.st_distance(s.location, c.proposed_location)
    limit 1
  ) nearest
  where c.review_status = 'pending'
  order by c.confidence_score desc, c.source_name, c.provider
$$;

revoke all on function public.station_candidate_review_queue() from public, anon, authenticated;
grant execute on function public.station_candidate_review_queue() to service_role;

create function public.review_station_geocoding_candidate(
  p_candidate_id bigint,
  p_action text,
  p_reviewer_id uuid,
  p_station_id uuid default null
)
returns table (candidate_id bigint, review_status text, station_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate public.station_geocoding_candidates%rowtype;
  v_station_id uuid;
  v_source_url text;
begin
  if not exists (
    select 1 from public.profiles
    where id = p_reviewer_id and role = 'wekode_ops'
  ) then
    raise exception 'Only WeKode operations reviewers can moderate station candidates.';
  end if;

  if p_action not in ('accept', 'reject', 'create') then
    raise exception 'Unsupported candidate action.';
  end if;

  select * into v_candidate
  from public.station_geocoding_candidates
  where id = p_candidate_id and review_status = 'pending'
  for update;

  if not found then
    raise exception 'Candidate is no longer awaiting review.';
  end if;

  if p_action = 'reject' then
    update public.station_geocoding_candidates
    set review_status = 'rejected', reviewed_by = p_reviewer_id,
        reviewed_at = now(), updated_at = now()
    where source = v_candidate.source
      and source_record_id = v_candidate.source_record_id
      and review_status = 'pending';
  elsif p_action = 'accept' then
    if p_station_id is null or not exists (
      select 1 from public.stations where id = p_station_id and active = true
    ) then
      raise exception 'Choose an active station to accept this candidate.';
    end if;
    v_station_id := p_station_id;
  else
    if exists (
      select 1 from public.stations
      where active = true
        and extensions.st_dwithin(location, v_candidate.proposed_location, 75)
    ) then
      raise exception 'An existing station is within 75 metres. Accept the candidate against that station instead.';
    end if;

    insert into public.stations (
      name, brand, location, city, address, verified, active
    ) values (
      v_candidate.source_name,
      case when lower(v_candidate.operator_name) = 'puma' then 'Puma'
           when lower(v_candidate.operator_name) = 'petroda' then 'Petroda'
           else v_candidate.operator_name end,
      v_candidate.proposed_location,
      v_candidate.source_city,
      coalesce(v_candidate.source_address, v_candidate.result_address),
      true,
      true
    ) returning id into v_station_id;
  end if;

  if p_action in ('accept', 'create') then
    v_source_url := case v_candidate.source
      when 'puma_energy_mw' then 'https://pumaenergy.com/wp-content/uploads/2025/08/Puma-Energy-Africa-Stations-Locations.pdf'
      when 'petroda_mw' then 'https://petrodamw.com/index.php/service-stations'
      else null
    end;

    insert into public.station_sources (
      source, source_record_id, station_id, source_url, source_name,
      source_city, source_location, metadata, last_seen_at
    ) values (
      v_candidate.source, v_candidate.source_record_id, v_station_id,
      v_source_url, v_candidate.source_name, v_candidate.source_city,
      v_candidate.proposed_location,
      jsonb_build_object(
        'match_type', case when p_action = 'create' then 'manual_candidate_create' else 'manual_candidate_match' end,
        'provider', v_candidate.provider,
        'confidence_score', v_candidate.confidence_score
      ),
      now()
    )
    on conflict (source, source_record_id) do update set
      station_id = excluded.station_id,
      source_name = excluded.source_name,
      source_city = excluded.source_city,
      source_location = excluded.source_location,
      metadata = excluded.metadata,
      last_seen_at = now();

    update public.station_geocoding_candidates
    set review_status = 'accepted', matched_station_id = v_station_id,
        reviewed_by = p_reviewer_id, reviewed_at = now(), updated_at = now()
    where source = v_candidate.source
      and source_record_id = v_candidate.source_record_id
      and review_status = 'pending';

    update public.stations
    set brand = case when lower(v_candidate.operator_name) = 'puma' then 'Puma'
                     when lower(v_candidate.operator_name) = 'petroda' then 'Petroda'
                     else brand end,
        verified = true,
        updated_at = now()
    where id = v_station_id;
  end if;

  insert into public.station_candidate_reviews (candidate_id, reviewer_id, action, station_id)
  values (p_candidate_id, p_reviewer_id, p_action, v_station_id);

  return query select p_candidate_id,
    case when p_action = 'reject' then 'rejected' else 'accepted' end,
    v_station_id;
end;
$$;

revoke all on function public.review_station_geocoding_candidate(bigint, text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.review_station_geocoding_candidate(bigint, text, uuid, uuid)
  to service_role;
