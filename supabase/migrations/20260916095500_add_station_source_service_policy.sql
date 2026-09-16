create policy "service role manages station provenance"
  on public.station_sources
  for all
  to service_role
  using (true)
  with check (true);
