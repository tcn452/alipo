-- All test records are rolled back; safe against a linked database.
begin;
do $$
declare station uuid; votes bigint; n bigint;
begin
  station := public.create_address_station('Hotfix rollback test','Independent','Test','Rollback test address',-12.34567,34.12345,repeat('a',64));
  if (select verified from public.stations where id=station) then raise exception 'Address station verified too early'; end if;
  votes := public.submit_station_location_vote(station,-12.34567,34.12345,10,repeat('b',64));
  if votes<>1 then raise exception 'First vote failed'; end if;
  votes := public.submit_station_location_vote(station,-12.34567,34.12345,10,repeat('b',64));
  if votes<>1 then raise exception 'Duplicate voter counted'; end if;
  votes := public.submit_station_location_vote(station,-12.34567,34.12345,10,repeat('c',64));
  if votes<>2 or not (select verified from public.stations where id=station) then raise exception 'Second vote did not verify'; end if;
  insert into public.fuel_reports(station_id,status,fuel_type,source,reporter_phone_hash,is_active,expires_at)
  values(station,'available','diesel','web',repeat('b',64),true,now()+interval '12 hours'),
    (station,'available','diesel','web',repeat('b',64),true,now()+interval '12 hours'),
    (station,'available','diesel','web',repeat('c',64),true,now()+interval '12 hours');
  select diesel_confirmations into n from public.station_fuel_report_counts() where id=station;
  if n<>2 then raise exception 'Distinct diesel reporters expected 2, got %',n; end if;
end;
$$;
rollback;
