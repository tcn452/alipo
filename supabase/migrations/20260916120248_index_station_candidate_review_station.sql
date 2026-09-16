create index station_candidate_reviews_station_idx
  on public.station_candidate_reviews (station_id)
  where station_id is not null;
