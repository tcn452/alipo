create table public.station_absence_reports (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  reporter_fingerprint text not null check (char_length(reporter_fingerprint) = 64),
  source public.report_source not null default 'web',
  created_at timestamptz not null default now(),
  constraint station_absence_reports_unique_reporter unique (station_id, reporter_fingerprint)
);

create index station_absence_reports_station_created_idx
  on public.station_absence_reports (station_id, created_at desc);

alter table public.station_absence_reports enable row level security;

revoke all on public.station_absence_reports from anon, authenticated;

create function private.deactivate_missing_station()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (
    select count(*) >= 5
    from public.station_absence_reports
    where station_id = new.station_id
  ) then
    update public.stations
    set active = false, updated_at = now()
    where id = new.station_id and active;
  end if;

  return new;
end;
$$;

create trigger station_absence_reports_deactivate_station
after insert on public.station_absence_reports
for each row execute function private.deactivate_missing_station();

;
