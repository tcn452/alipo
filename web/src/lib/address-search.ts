export type AddressMatch = { id: string; label: string; latitude: number; longitude: number };

export function addressQuery(address: string, city: string): string {
  return [address.trim().replace(/\s+/g, ' '), city.trim()].filter(Boolean).join(', ');
}

export function parseAddressMatches(data: unknown): AddressMatch[] {
  const features = (data as { features?: unknown[] } | null)?.features;
  if (!Array.isArray(features)) return [];
  const matches: AddressMatch[] = [];
  for (const feature of features) {
    const item = feature as { properties?: Record<string, unknown>; geometry?: { type?: string; coordinates?: unknown[] } } | null;
    const p = item?.properties;
    const [longitude, latitude] = item?.geometry?.coordinates || [];
    if (!p || String(p.countrycode).toUpperCase() !== 'MW' || item?.geometry?.type !== 'Point'
      || typeof latitude !== 'number' || typeof longitude !== 'number'
      || !Number.isFinite(latitude) || !Number.isFinite(longitude)
      || latitude < -17.2 || latitude > -9.2 || longitude < 32.6 || longitude > 35.95) continue;
    const label = Array.from(new Set([p.name, p.housenumber, p.street, p.locality, p.city, p.district, p.state, p.country]
      .filter((value): value is string => typeof value === 'string' && value.length > 0))).join(', ');
    if (!label) continue;
    const id = `${p.osm_type || ''}:${p.osm_id || ''}:${latitude}:${longitude}`;
    if (!matches.some((match) => match.id === id)) matches.push({ id, label, latitude, longitude });
  }
  return matches.slice(0, 5);
}
