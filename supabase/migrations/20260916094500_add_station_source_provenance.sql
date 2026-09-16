create table if not exists public.station_sources (
  source text not null,
  source_record_id text not null,
  station_id uuid not null references public.stations(id) on delete cascade,
  source_url text,
  source_name text,
  source_city text,
  source_location extensions.geography(point, 4326),
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (source, source_record_id)
);

create index if not exists station_sources_station_id_idx
  on public.station_sources (station_id);

alter table public.station_sources enable row level security;

revoke all on table public.station_sources from anon, authenticated;
grant all on table public.station_sources to service_role;

comment on table public.station_sources is
  'Private provenance for station records imported or confirmed from external and operator-owned sources.';
