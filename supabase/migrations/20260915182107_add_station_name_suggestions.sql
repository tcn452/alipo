alter table public.stations
  add column suggested_name text,
  add column name_suggestion_count smallint not null default 0,
  add column name_confirmed_at timestamptz,
  add constraint stations_suggested_name_length check (
    suggested_name is null or char_length(suggested_name) between 2 and 200
  ),
  add constraint stations_name_suggestion_count_valid check (name_suggestion_count >= 0);

create table public.station_name_suggestions (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  suggested_name text not null check (char_length(suggested_name) between 2 and 200),
  normalized_name text not null check (char_length(normalized_name) between 2 and 200),
  reporter_fingerprint text not null check (char_length(reporter_fingerprint) = 64),
  source public.report_source not null default 'web',
  created_at timestamptz not null default now(),
  constraint station_name_suggestions_unique_vote unique (station_id, normalized_name, reporter_fingerprint)
);

create index station_name_suggestions_station_name_idx
  on public.station_name_suggestions (station_id, normalized_name);

alter table public.station_name_suggestions enable row level security;
revoke all on table public.station_name_suggestions from anon, authenticated;
grant select, insert on table public.station_name_suggestions to service_role;

create function public.submit_station_name_suggestion(
  p_station_id uuid,
  p_suggested_name text,
  p_normalized_name text,
  p_reporter_fingerprint text
)
returns table (vote_count integer, confirmed boolean, station_name text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_count integer;
begin
  perform 1
  from public.stations
  where id = p_station_id and active
  for update;

  if not found then
    raise exception 'Station not found';
  end if;

  insert into public.station_name_suggestions (
    station_id, suggested_name, normalized_name, reporter_fingerprint, source
  ) values (
    p_station_id, p_suggested_name, p_normalized_name, p_reporter_fingerprint, 'web'
  )
  on conflict (station_id, normalized_name, reporter_fingerprint) do nothing;

  select count(distinct suggestion.reporter_fingerprint)::integer
  into current_count
  from public.station_name_suggestions suggestion
  where suggestion.station_id = p_station_id
    and suggestion.normalized_name = p_normalized_name;

  update public.stations
  set suggested_name = p_suggested_name,
      name_suggestion_count = current_count,
      name = case when current_count >= 2 then p_suggested_name else name end,
      name_confirmed_at = case when current_count >= 2 then now() else name_confirmed_at end,
      updated_at = now()
  where id = p_station_id;

  return query select current_count, current_count >= 2,
    case when current_count >= 2 then p_suggested_name else (select s.name from public.stations s where s.id = p_station_id) end;
end;
$$;

revoke all on function public.submit_station_name_suggestion(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_station_name_suggestion(uuid, text, text, text) to service_role;
