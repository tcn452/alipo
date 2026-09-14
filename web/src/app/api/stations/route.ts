import { Station } from '@/types/alipo';

export const dynamic = 'force-dynamic';

interface OverpassElement {
  id: number;
  type: 'node' | 'way' | 'relation';
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const MAX_RADIUS_KM = 50;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const city = params.get('city') || 'Lilongwe';
  const radiusKm = Math.min(MAX_RADIUS_KM, Math.max(10, Number(params.get('radius')) || 10));
  const latitude = Number(params.get('lat'));
  const longitude = Number(params.get('lon'));
  const allMalawi = city === 'All Cities';

  if (!allMalawi && (!Number.isFinite(latitude) || !Number.isFinite(longitude))) {
    return Response.json({ error: 'A valid city centre is required.' }, { status: 400 });
  }

  const selector = allMalawi
    ? 'area["ISO3166-1"="MW"][admin_level=2]->.country;nwr["amenity"="fuel"](area.country);'
    : `nwr["amenity"="fuel"](around:${radiusKm * 1000},${latitude},${longitude});`;
  const query = `[out:json][timeout:30];${selector}out center tags qt;`;
  const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.openstreetmap.fr/api/interpreter'];
  let elements: OverpassElement[] | null = null;
  let lastError = 'OpenStreetMap station lookup unavailable';

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'User-Agent': 'Alipo/1.0 (https://wekode.dev)' },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`OpenStreetMap returned ${response.status}`);
      const data = await response.json() as { elements?: OverpassElement[] };
      elements = data.elements || [];
      break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }

  if (!elements) return Response.json({ stations: [], error: lastError }, { status: 502 });

  const stations = elements.flatMap((element): Station[] => {
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (lat === undefined || lon === undefined) return [];
    const tags = element.tags || {};
    const name = tags.name || tags.brand || tags.operator || 'Fuel station';
    const mappedCity = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || (allMalawi ? 'Malawi' : city);
    return [{
      id: `osm-${element.type}-${element.id}`,
      name,
      brand: tags.brand || tags.operator || (name === 'Fuel station' ? 'Independent' : name.split(' ')[0]),
      latitude: lat,
      longitude: lon,
      district: tags['addr:suburb'] || tags['addr:district'] || tags['addr:street'] || mappedCity,
      city: mappedCity,
      verified: false,
      fuel_types: ['petrol', 'diesel'],
      latest_status: 'unknown',
      contact_phone: tags.phone || tags['contact:phone'],
    }];
  });

  return Response.json({ stations, radius_km: allMalawi ? null : radiusKm, source: 'OpenStreetMap contributors' }, {
    headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
  });
}
