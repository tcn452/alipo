create function public.station_fuel_evidence_summary()
returns table(id uuid,petrol_reports bigint,diesel_reports bigint,needs_location_confirmation boolean)
language sql stable security invoker set search_path = '' as $$
  select s.id,
    count(r.id) filter(where r.fuel_type in ('petrol','both') and r.status=s.petrol_status),
    count(r.id) filter(where r.fuel_type in ('diesel','both') and r.status=s.diesel_status),
    not s.verified and exists(select 1 from public.community_station_submissions c where c.station_id=s.id)
  from public.stations s left join public.fuel_reports r on r.station_id=s.id and r.is_active and r.expires_at>now()
  where s.active group by s.id;
$$;
revoke all on function public.station_fuel_evidence_summary() from public,anon,authenticated;
grant execute on function public.station_fuel_evidence_summary() to service_role;
