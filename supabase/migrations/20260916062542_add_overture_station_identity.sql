alter table public.stations
  add column overture_id uuid,
  add column overture_synced_at timestamptz;

alter table public.stations
  add constraint stations_overture_identity unique (overture_id);;
