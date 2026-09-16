alter table public.stations
  add column fsq_place_id text,
  add column fsq_refreshed_at date,
  add column fsq_synced_at timestamptz;

alter table public.stations
  add constraint stations_fsq_place_identity unique (fsq_place_id);
