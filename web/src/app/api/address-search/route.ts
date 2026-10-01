import { NextRequest, NextResponse } from 'next/server';
import { addressQuery, parseAddressMatches } from '@/lib/address-search';

export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get('content-length') || 0) > 4096) return NextResponse.json({ error: 'Address is too long.' }, { status: 413 });
    const body = await request.json().catch(() => null) as { address?: unknown; city?: unknown } | null;
    if (!body || typeof body.address !== 'string' || body.address.trim().length < 3 || body.address.length > 500
      || (body.city !== undefined && (typeof body.city !== 'string' || body.city.length > 100))) {
      return NextResponse.json({ error: 'Enter an address or nearby landmark first.' }, { status: 400 });
    }
    const url = new URL('https://photon.komoot.io/api/');
    url.search = new URLSearchParams({ q: addressQuery(body.address, typeof body.city === 'string' ? body.city : ''), countrycode: 'MW', limit: '5', lang: 'en' }).toString();
    // Explicit searches only; cache place lookups, never fuel availability.
    const response = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'AlipoStationAddressSearch/1.0 (https://www.alipo.co.mw)' } });
    if (!response.ok) throw new Error('Geocoder unavailable');
    return NextResponse.json({ matches: parseAddressMatches(await response.json()) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Address search is unavailable. Please place the pin on the map instead.' }, { status: 503 });
  }
}
