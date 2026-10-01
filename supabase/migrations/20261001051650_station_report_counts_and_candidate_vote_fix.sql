-- Qualify the vote column: station_id is also a RETURNS TABLE variable.
do $$
declare definition text;
begin
  select pg_get_functiondef('public.submit_station_candidate_vote(bigint,text,uuid,text)'::regprocedure) into definition;
  definition := replace(definition, 'from public.station_candidate_votes
  where candidate_id = p_candidate_id
    and action = p_action
    and (p_action <> ''accept'' or station_id = p_station_id)', 'from public.station_candidate_votes v
  where v.candidate_id = p_candidate_id
    and v.action = p_action
    and (p_action <> ''accept'' or v.station_id = p_station_id)');
  if definition not like '%v.station_id = p_station_id%' then raise exception 'Vote function did not match expected definition'; end if;
  execute definition;
end;
$$;

-- Expose counts only, never reporter identities. Anonymous reports are not
-- counted as distinct people; each phone fingerprint contributes once per fuel.
create function public.station_fuel_report_counts()
returns table (id uuid, petrol_confirmations bigint, diesel_confirmations bigint)
language sql stable security invoker set search_path = ''
as $$
  with latest as (
    select distinct on (r.station_id, f.fuel) r.station_id, f.fuel, r.status, r.created_at
    from public.fuel_reports r
    cross join lateral (select unnest(case when r.fuel_type = 'both' then array['petrol','diesel'] else array[r.fuel_type::text] end) fuel) f
    where r.is_active and r.expires_at > now()
    order by r.station_id, f.fuel, r.created_at desc
  ), votes as (
    select l.station_id, l.fuel, count(distinct r.reporter_phone_hash) n
    from latest l join public.fuel_reports r on r.station_id = l.station_id
      and r.status = l.status and r.fuel_type::text in (l.fuel, 'both')
      and r.is_active and r.expires_at > now()
      -- An opposing report starts a new availability episode.
      and r.created_at > coalesce((select max(o.created_at) from public.fuel_reports o
        where o.station_id = l.station_id and o.fuel_type::text in (l.fuel, 'both')
          and o.status <> l.status and o.created_at <= l.created_at), '-infinity'::timestamptz)
    group by l.station_id, l.fuel
  )
  select s.id, coalesce(max(v.n) filter(where v.fuel='petrol'),0), coalesce(max(v.n) filter(where v.fuel='diesel'),0)
  from public.stations s left join votes v on v.station_id=s.id where s.active group by s.id;
$$;
revoke all on function public.station_fuel_report_counts() from public, anon, authenticated;
grant execute on function public.station_fuel_report_counts() to service_role;
