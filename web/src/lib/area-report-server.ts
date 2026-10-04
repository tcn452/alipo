import 'server-only';
import { cache } from 'react';
import { createSupabasePublicClient } from '@/lib/supabase-server';
import { buildAreaReport, type AreaFuel } from '@/lib/area-share';
import type { Station } from '@/types/alipo';

export const getAreaReport = cache(async (area: string, fuel: AreaFuel) => {
  const client = createSupabasePublicClient();
  if (!client) throw new Error('Area reports are unavailable.');
  const [catalogue, statuses] = await Promise.all([
    client.rpc('all_stations'),
    client.from('stations').select('id,petrol_status,diesel_status,petrol_reported_at,diesel_reported_at,last_reported_at').eq('active', true),
  ]);
  if (catalogue.error || statuses.error) throw new Error('Area reports are unavailable.');
  const byId = new Map((statuses.data || []).map((station) => [station.id, station]));
  const stations: Station[] = (catalogue.data || []).filter((station: Station) => byId.has(station.id)).map((station: Station) => ({
    id: String(station.id), name: String(station.name || 'Fuel station'), brand: String(station.brand || ''),
    city: String(station.city || 'Malawi'), district: String(station.district || station.city || 'Malawi'),
    fuel_types: Array.isArray(station.fuel_types) ? station.fuel_types.filter((fuel) => fuel === 'petrol' || fuel === 'diesel') : ['petrol', 'diesel'],
    verified: Boolean(station.verified), latitude: Number(station.latitude), longitude: Number(station.longitude),
    ...byId.get(station.id),
  }));
  return buildAreaReport(stations, area, fuel);
});
