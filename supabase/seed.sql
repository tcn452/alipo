-- Small, repeatable development/preview dataset. Production station records are
-- imported from OpenStreetMap by the Alipo sync job rather than this file.

insert into public.stations (
  id, name, brand, location, district, city, verified, fuel_types,
  latest_status, latest_queue, last_reported_at, active
)
values
  ('00000000-0000-4000-8000-000000000101', 'Puma Area 47', 'Puma', extensions.st_setsrid(extensions.st_makepoint(33.7915, -13.9572), 4326)::extensions.geography, 'Area 47', 'Lilongwe', true, array['petrol'::public.fuel_type, 'diesel'::public.fuel_type], 'available', 'short', now(), true),
  ('00000000-0000-4000-8000-000000000102', 'TotalEnergies City Centre', 'TotalEnergies', extensions.st_setsrid(extensions.st_makepoint(33.7845, -13.9712), 4326)::extensions.geography, 'City Centre', 'Lilongwe', true, array['petrol'::public.fuel_type, 'diesel'::public.fuel_type], 'available', 'medium', now(), true),
  ('00000000-0000-4000-8000-000000000103', 'Petroda Kanengo Industrial', 'Petroda', extensions.st_setsrid(extensions.st_makepoint(33.7741, -13.8821), 4326)::extensions.geography, 'Kanengo', 'Lilongwe', false, array['petrol'::public.fuel_type, 'diesel'::public.fuel_type], 'low', 'long', now(), true),
  ('00000000-0000-4000-8000-000000000201', 'TotalEnergies Chichiri', 'TotalEnergies', extensions.st_setsrid(extensions.st_makepoint(35.0254, -15.7981), 4326)::extensions.geography, 'Chichiri', 'Blantyre', true, array['petrol'::public.fuel_type, 'diesel'::public.fuel_type], 'available', 'short', now(), true),
  ('00000000-0000-4000-8000-000000000301', 'Puma Mzuzu CBD', 'Puma', extensions.st_setsrid(extensions.st_makepoint(34.0152, -11.4589), 4326)::extensions.geography, 'CBD', 'Mzuzu', true, array['petrol'::public.fuel_type, 'diesel'::public.fuel_type], 'unknown', null, null, true),
  ('00000000-0000-4000-8000-000000000401', 'Petroda Zomba', 'Petroda', extensions.st_setsrid(extensions.st_makepoint(35.3333, -15.3833), 4326)::extensions.geography, 'Zomba Central', 'Zomba', false, array['petrol'::public.fuel_type, 'diesel'::public.fuel_type], 'out', 'none', now(), true)
on conflict (id) do update set
  name = excluded.name,
  brand = excluded.brand,
  location = excluded.location,
  district = excluded.district,
  city = excluded.city,
  verified = excluded.verified,
  fuel_types = excluded.fuel_types,
  latest_status = excluded.latest_status,
  latest_queue = excluded.latest_queue,
  last_reported_at = excluded.last_reported_at,
  active = excluded.active;

insert into public.fuel_reports (
  id, station_id, status, fuel_type, queue_estimate, source,
  confirmations, confidence, is_active, expires_at, created_at
)
values
  ('10000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000101', 'available', 'both', 'short', 'verified_station', 3, 0.900, true, now() + interval '3 hours', now()),
  ('10000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000102', 'available', 'both', 'medium', 'verified_station', 2, 0.850, true, now() + interval '3 hours', now()),
  ('10000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000103', 'low', 'diesel', 'long', 'web', 1, 0.600, true, now() + interval '3 hours', now()),
  ('10000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000401', 'out', 'both', 'none', 'web', 2, 0.700, true, now() + interval '6 hours', now())
on conflict (id) do update set
  status = excluded.status,
  fuel_type = excluded.fuel_type,
  queue_estimate = excluded.queue_estimate,
  confirmations = excluded.confirmations,
  confidence = excluded.confidence,
  is_active = excluded.is_active,
  expires_at = excluded.expires_at,
  created_at = excluded.created_at;

insert into public.companies (id, name, type, billing_status, plan)
values ('20000000-0000-4000-8000-000000000001', 'Alipo Demo Fleet', 'logistics', 'trial', 'starter')
on conflict (id) do update set name = excluded.name, type = excluded.type, billing_status = excluded.billing_status, plan = excluded.plan;

insert into public.vehicles (id, company_id, plate, assigned_driver_name, fuel_type, tank_capacity_litres)
values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'ALIPO 01', 'Demo Driver', 'diesel', 70)
on conflict (id) do update set company_id = excluded.company_id, plate = excluded.plate, assigned_driver_name = excluded.assigned_driver_name, fuel_type = excluded.fuel_type, tank_capacity_litres = excluded.tank_capacity_litres;
