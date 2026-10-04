import 'server-only';
import { createSupabasePublicClient } from '@/lib/supabase-server';
import type { Station } from '@/types/alipo';
import { cache } from 'react';

export const getSharedStation = cache(async (id: string): Promise<Station | null> => {
  const client = createSupabasePublicClient();
  if (!client) return null;
  const osm = id.match(/^osm-(node|way|relation)-(\d+)$/);
  if (!osm && !/^[0-9a-f-]{36}$/i.test(id)) return null;
  let query = client.from('stations').select('id,name,brand,city,district,fuel_types,petrol_status,diesel_status,petrol_reported_at,diesel_reported_at,last_reported_at').eq('active', true);
  query = osm ? query.eq('osm_type', osm[1]).eq('osm_id', Number(osm[2])) : query.eq('id', id);
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return { ...data, latitude: 0, longitude: 0, verified: false } as Station;
});
