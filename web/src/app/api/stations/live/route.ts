import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { classifyStationBrand } from '@/lib/constants';
import { Station } from '@/types/alipo';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function stationFromSupabase(row: Record<string, unknown>): Station | null {
  let latitude = typeof row.latitude === 'number' ? row.latitude : undefined;
  let longitude = typeof row.longitude === 'number' ? row.longitude : undefined;
  let location = row.location;
  if (typeof location === 'string') {
    try { location = JSON.parse(location); } catch { location = null; }
  }
  if ((!latitude || !longitude) && location && typeof location === 'object' && 'coordinates' in location) {
    const coordinates = (location as { coordinates?: unknown }).coordinates;
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      longitude = Number(coordinates[0]);
      latitude = Number(coordinates[1]);
    }
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const lastReportedAt = row.last_reported_at ? String(row.last_reported_at) : undefined;
  const reportedStatus = row.latest_status as Station['latest_status'];
  const isStale = lastReportedAt ? Date.now() - new Date(lastReportedAt).getTime() >= 4 * 60 * 60 * 1000 : false;
  const fuelStatus = (fuel: 'petrol' | 'diesel') => {
    const reportedAt = row[`${fuel}_reported_at`] ? String(row[`${fuel}_reported_at`]) : undefined;
    const status = (row[`${fuel}_status`] || 'unknown') as Station['latest_status'];
    return { status, isStale: Boolean(reportedAt && Date.now() - new Date(reportedAt).getTime() >= 4 * 60 * 60 * 1000 && status !== 'unknown'), reportedAt };
  };
  const petrol = fuelStatus('petrol');
  const diesel = fuelStatus('diesel');

  return {
    id: String(row.id),
    name: String(row.name || 'Fuel station'),
    brand: classifyStationBrand(String(row.name || ''), String(row.brand || '')),
    latitude: latitude as number,
    longitude: longitude as number,
    district: String(row.district || row.city || 'Malawi'),
    city: String(row.city || 'Malawi'),
    verified: Boolean(row.verified),
    fuel_types: Array.isArray(row.fuel_types) ? row.fuel_types.filter((type): type is 'petrol' | 'diesel' => type === 'petrol' || type === 'diesel') : ['petrol', 'diesel'],
    latest_status: reportedStatus,
    is_stale: isStale && reportedStatus !== 'unknown',
    petrol_status: petrol.status,
    diesel_status: diesel.status,
    petrol_is_stale: petrol.isStale,
    diesel_is_stale: diesel.isStale,
    petrol_reported_at: petrol.reportedAt,
    diesel_reported_at: diesel.reportedAt,
    latest_queue: row.latest_queue as Station['latest_queue'],
    petrol_confidence: typeof row.petrol_confidence === 'number' ? row.petrol_confidence : Number(row.petrol_confidence || 0),
    diesel_confidence: typeof row.diesel_confidence === 'number' ? row.diesel_confidence : Number(row.diesel_confidence || 0),
    petrol_confirmations: Number(row.petrol_confirmations || 0),
    diesel_confirmations: Number(row.diesel_confirmations || 0),
    last_reported_at: lastReportedAt,
    updated: row.updated_at ? String(row.updated_at) : undefined,
    distance_km: typeof row.distance_km === 'number' ? row.distance_km : undefined,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || 'All Cities';
  const lat = Number(searchParams.get('lat'));
  const lon = Number(searchParams.get('lon'));
  const radiusKm = Number(searchParams.get('radius')) || 5;

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ stations: [], error: 'Supabase not configured' }, { status: 503 });
  }

  try {
    const query = (city === 'All Cities' || !Number.isFinite(lat) || !Number.isFinite(lon))
      ? supabase.rpc('all_stations')
      : supabase.rpc('nearby_stations', { p_latitude: lat, p_longitude: lon, p_radius_km: radiusKm });

    const { data, error } = await query;
    if (error) throw error;

    const stations = ((data || []) as Record<string, unknown>[]).flatMap((row) => {
      const station = stationFromSupabase(row);
      return station ? [station] : [];
    });

    return NextResponse.json(
      { stations, total: stations.length },
      {
        headers: {
          // Edge caching: cache for 30s at CDN level, serve stale while revalidating in background
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
          'CDN-Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
          'Vercel-CDN-Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        },
      }
    );
  } catch (err) {
    console.error('Failed to fetch stations in /api/stations/live:', err);
    return NextResponse.json({ stations: [], error: 'Failed to fetch stations' }, { status: 500 });
  }
}
