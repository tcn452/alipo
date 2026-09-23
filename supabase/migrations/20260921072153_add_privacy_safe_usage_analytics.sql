create table public.app_usage_daily (
  visitor_hash text not null check (char_length(visitor_hash) = 64),
  usage_date date not null default current_date,
  channel text not null check (channel in ('pwa', 'web')),
  visit_count integer not null default 1 check (visit_count > 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (visitor_hash, usage_date)
);

create index app_usage_daily_date_idx on public.app_usage_daily (usage_date desc);

create function public.record_app_usage(p_visitor_hash text, p_channel text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if char_length(p_visitor_hash) <> 64 or p_channel not in ('pwa', 'web') then
    raise exception 'Invalid analytics event';
  end if;

  insert into public.app_usage_daily (visitor_hash, usage_date, channel)
  values (p_visitor_hash, current_date, p_channel)
  on conflict (visitor_hash, usage_date) do update
  set channel = excluded.channel,
      visit_count = public.app_usage_daily.visit_count + 1,
      last_seen_at = now();
end;
$$;

create table public.report_analytics (
  report_id uuid primary key,
  station_id uuid references public.stations(id) on delete set null,
  reporter_hash text,
  status public.fuel_status not null,
  fuel_type public.fuel_type not null,
  source public.report_source not null,
  created_at timestamptz not null
);

create index report_analytics_created_idx on public.report_analytics (created_at desc);
create index report_analytics_station_created_idx on public.report_analytics (station_id, created_at desc);

insert into public.report_analytics (report_id, station_id, reporter_hash, status, fuel_type, source, created_at)
select id, station_id, reporter_phone_hash, status, fuel_type, source, created_at
from public.fuel_reports
on conflict (report_id) do nothing;

create function private.capture_report_analytics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.report_analytics (report_id, station_id, reporter_hash, status, fuel_type, source, created_at)
  values (new.id, new.station_id, new.reporter_phone_hash, new.status, new.fuel_type, new.source, new.created_at)
  on conflict (report_id) do nothing;
  return new;
end;
$$;

create trigger fuel_reports_capture_analytics
after insert on public.fuel_reports
for each row execute function private.capture_report_analytics();

alter table public.app_usage_daily enable row level security;
alter table public.report_analytics enable row level security;
revoke all on table public.app_usage_daily, public.report_analytics from anon, authenticated;
revoke execute on function public.record_app_usage(text, text) from public, anon, authenticated;
grant execute on function public.record_app_usage(text, text) to service_role;
revoke execute on function private.capture_report_analytics() from public, anon, authenticated;
