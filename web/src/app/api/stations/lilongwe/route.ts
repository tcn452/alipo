import { unstable_cache } from 'next/cache';
import { Station } from '@/types/alipo';

const LILONGWE = { latitude: -13.9626, longitude: 33.7741 };
const RADIUS_METRES = 20_000;
export const dynamic = 'force-dynamic';

interface OverpassElement {
  id: number;
  type: 'node' | 'way' | 'relation';
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const toRadians = (value: number) => value * Math.PI / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const haversine = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

const loadLilongweFuelStations = unstable_cache(async () => {
  // A bounding-box lookup is materially faster on Overpass than a large `around`
  // query. Results are trimmed back to the exact 20 km circle below.
  const query = '[out:json][timeout:20];nw["amenity"="fuel"](-14.143,33.589,-13.782,33.960);out center tags qt;';
  const endpoints = [
    'https://overpass.openstreetmap.fr/api/interpreter',
    'https://overpass-api.de/api/interpreter',
  ];
  let data: OverpassResponse | null = null;
  let lastError = 'OpenStreetMap lookup unavailable';

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'Alipo/1.0 (Malawi fuel availability map)',
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error(`OpenStreetMap lookup failed with ${response.status}`);
      data = await response.json() as OverpassResponse;
      break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }

  if (!data) throw new Error(lastError);

  const candidates = (data.elements || []).flatMap((element) => {
    const latitude = element.lat ?? element.center?.lat;
    const longitude = element.lon ?? element.center?.lon;
    if (latitude === undefined || longitude === undefined) return [];
    if (distanceKm(LILONGWE, { latitude, longitude }) > RADIUS_METRES / 1000) return [];
    const tags = element.tags || {};
    const name = tags.name || tags.brand || tags.operator || 'Fuel station';
    const brand = tags.brand || tags.operator || (name === 'Fuel station' ? 'Independent' : name.split(' ')[0]);
    const fuelTypes: ('petrol' | 'diesel')[] = [];
    if (tags['fuel:octane_91'] !== 'no' || tags['fuel:octane_95'] !== 'no' || !Object.keys(tags).some((key) => key.startsWith('fuel:'))) fuelTypes.push('petrol');
    if (tags['fuel:diesel'] !== 'no') fuelTypes.push('diesel');

    return [{
      id: `osm-${element.type}-${element.id}`,
      name,
      brand,
      latitude,
      longitude,
      district: tags['addr:suburb'] || tags['addr:city'] || tags['addr:street'] || 'Lilongwe',
      city: 'Lilongwe',
      verified: false,
      fuel_types: fuelTypes.length ? fuelTypes : ['petrol', 'diesel'],
      latest_status: 'unknown' as const,
      contact_phone: tags.phone || tags['contact:phone'],
    } satisfies Station];
  }).sort((a, b) => Number(b.name !== 'Fuel station') - Number(a.name !== 'Fuel station'));

  const stations: Station[] = [];
  for (const candidate of candidates) {
    const duplicate = stations.some((station) => distanceKm(station, candidate) < 0.09);
    if (!duplicate) stations.push(candidate);
  }

  return stations.sort((a, b) => a.name.localeCompare(b.name));
}, ['osm-lilongwe-fuel-stations-20km'], { revalidate: 21_600 });

export async function GET() {
  try {
    const stations = await loadLilongweFuelStations();
    return Response.json({ stations, radius_km: 20, source: 'OpenStreetMap contributors' }, {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    });
  } catch (error) {
    return Response.json({ stations: [], radius_km: 20, source: 'OpenStreetMap contributors', error: error instanceof Error ? error.message : 'Station lookup unavailable' }, { status: 502 });
  }
}
