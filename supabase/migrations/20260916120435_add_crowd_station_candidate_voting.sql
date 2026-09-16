create table public.station_candidate_votes (
  id bigint generated always as identity primary key,
  source text not null,
  source_record_id text not null,
  candidate_id bigint not null references public.station_geocoding_candidates(id) on delete cascade,
  action text not null check (action in ('accept', 'reject', 'create')),
  station_id uuid references public.stations(id) on delete cascade,
  reporter_fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_record_id, reporter_fingerprint)
);

create index station_candidate_votes_candidate_action_idx
  on public.station_candidate_votes (candidate_id, action, station_id);

create index station_candidate_votes_station_idx
  on public.station_candidate_votes (station_id)
  where station_id is not null;

alter table public.station_candidate_votes enable row level security;
revoke all on table public.station_candidate_votes from anon, authenticated;
revoke all on sequence public.station_candidate_votes_id_seq from anon, authenticated;
grant all on table public.station_candidate_votes to service_role;
grant usage, select on sequence public.station_candidate_votes_id_seq to service_role;

create policy "service role manages station candidate votes"
  on public.station_candidate_votes
  for all to service_role
  using (true) with check (true);

create function public.submit_station_candidate_vote(
  p_candidate_id bigint,
  p_action text,
  p_station_id uuid,
  p_reporter_fingerprint text
)
returns table (vote_count bigint, confirmed boolean, station_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate public.station_geocoding_candidates%rowtype;
  v_vote_count bigint;
  v_station_id uuid;
  v_source_url text;
begin
  if p_action not in ('accept', 'reject', 'create') then
    raise exception 'Unsupported candidate vote.';
  end if;
  if length(p_reporter_fingerprint) < 32 then
    raise exception 'A valid reporter fingerprint is required.';
  end if;

  select * into v_candidate
  from public.station_geocoding_candidates
  where id = p_candidate_id and review_status = 'pending'
  for update;

  if not found then
    raise exception 'Candidate is no longer awaiting review.';
  end if;
  if p_action = 'accept' and (
    p_station_id is null or not exists (
      select 1 from public.stations where id = p_station_id and active = true
    )
  ) then
    raise exception 'Choose an active station for this vote.';
  end if;

  insert into public.station_candidate_votes (
    source, source_record_id, candidate_id, action, station_id, reporter_fingerprint
  ) values (
    v_candidate.source, v_candidate.source_record_id, p_candidate_id,
    p_action, case when p_action = 'accept' then p_station_id else null end,
    p_reporter_fingerprint
  )
  on conflict (source, source_record_id, reporter_fingerprint) do update set
    candidate_id = excluded.candidate_id,
    action = excluded.action,
    station_id = excluded.station_id,
    updated_at = now();

  select count(*) into v_vote_count
  from public.station_candidate_votes
  where candidate_id = p_candidate_id
    and action = p_action
    and (p_action <> 'accept' or station_id = p_station_id);

  if v_vote_count < 2 then
    return query select v_vote_count, false, null::uuid;
    return;
  end if;

  if p_action = 'reject' then
    update public.station_geocoding_candidates
    set review_status = 'rejected', reviewed_at = now(), updated_at = now()
    where source = v_candidate.source
      and source_record_id = v_candidate.source_record_id
      and review_status = 'pending';
  elsif p_action = 'accept' then
    v_station_id := p_station_id;
  else
    if exists (
      select 1 from public.stations
      where active = true
        and extensions.st_dwithin(location, v_candidate.proposed_location, 75)
    ) then
      raise exception 'An existing station is within 75 metres. Vote to accept that station instead.';
    end if;

    insert into public.stations (name, brand, location, city, address, verified, active)
    values (
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
        'match_type', case when p_action = 'create' then 'crowd_candidate_create' else 'crowd_candidate_match' end,
        'provider', v_candidate.provider,
        'confidence_score', v_candidate.confidence_score,
        'confirming_votes', v_vote_count
      ), now()
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
        reviewed_at = now(), updated_at = now()
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

  return query select v_vote_count, true, v_station_id;
end;
$$;

revoke all on function public.submit_station_candidate_vote(bigint, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.submit_station_candidate_vote(bigint, text, uuid, text)
  to service_role;
