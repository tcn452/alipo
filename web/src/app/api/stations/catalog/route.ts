import { NextResponse } from 'next/server';
import { classifyStationBrand } from '@/lib/constants';
import { publicCdnCacheHeaders } from '@/lib/cache-headers';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { Station } from '@/types/alipo';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ stations: [], error: 'Supabase not configured' }, { status: 503 });
  }

  const { data, error } = await supabase.rpc('all_stations');
  if (error) {
    console.error('Failed to fetch station catalogue:', error);
    return NextResponse.json({ stations: [], error: 'Failed to fetch station catalogue' }, { status: 502 });
  }

  const stations: Station[] = ((data || []) as Record<string, unknown>[]).flatMap((row) => {
    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];

    return [{
      id: String(row.id),
      name: String(row.name || 'Fuel station'),
      brand: classifyStationBrand(String(row.name || ''), String(row.brand || '')),
      latitude,
      longitude,
      district: String(row.district || row.city || 'Malawi'),
      city: String(row.city || 'Malawi'),
      verified: Boolean(row.verified),
      fuel_types: Array.isArray(row.fuel_types)
        ? row.fuel_types.filter((type): type is 'petrol' | 'diesel' => type === 'petrol' || type === 'diesel')
        : ['petrol', 'diesel'],
    }];
  });

  return NextResponse.json(
    { stations, total: stations.length },
    { headers: publicCdnCacheHeaders(21_600, 86_400) },
  );
}
