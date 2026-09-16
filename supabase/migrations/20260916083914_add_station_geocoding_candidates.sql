create table public.station_geocoding_candidates (
  id bigint generated always as identity primary key,
  source text not null,
  source_record_id text not null,
  operator_name text not null,
  source_name text not null,
  source_city text,
  source_address text,
  query_text text not null,
  provider text not null,
  provider_place_id text,
  proposed_location extensions.geography(point, 4326) not null,
  result_name text,
  result_address text,
  result_type text,
  confidence_score smallint not null check (confidence_score between 0 and 100),
  evidence jsonb not null default '{}'::jsonb,
  raw_result jsonb not null default '{}'::jsonb,
  review_status text not null default 'pending'
    check (review_status in ('pending', 'accepted', 'rejected', 'superseded')),
  matched_station_id uuid references public.stations(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_record_id, provider, provider_place_id)
);

create index station_geocoding_candidates_pending_idx
  on public.station_geocoding_candidates (confidence_score desc, created_at)
  where review_status = 'pending';

create index station_geocoding_candidates_station_idx
  on public.station_geocoding_candidates (matched_station_id)
  where matched_station_id is not null;

alter table public.station_geocoding_candidates enable row level security;

revoke all on table public.station_geocoding_candidates from anon, authenticated;
revoke all on sequence public.station_geocoding_candidates_id_seq from anon, authenticated;
grant all on table public.station_geocoding_candidates to service_role;
grant usage, select on sequence public.station_geocoding_candidates_id_seq to service_role;

create policy "service role manages geocoding candidates"
  on public.station_geocoding_candidates
  for all
  to service_role
  using (true)
  with check (true);

comment on table public.station_geocoding_candidates is
  'Private, reviewable geocoding results for operator catalogue records that are not yet confidently linked to a station.';
