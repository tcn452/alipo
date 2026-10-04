import type { Station } from '../types/alipo';

// Reversible IDs avoid a link database and UUID prefix collisions.
export function stationShareCode(stationId: string): string | null {
  const osm = stationId.match(/^osm-(node|way|relation)-(\d+)$/);
  if (osm) return `${osm[1][0]}${osm[2]}`;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stationId)) return null;
  const bytes = stationId.replaceAll('-', '').match(/../g)!.map((hex) => parseInt(hex, 16));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function stationIdFromShareCode(code: string): string | null {
  const osm = code.match(/^([nwr])(\d+)$/);
  if (osm) return `osm-${{ n: 'node', w: 'way', r: 'relation' }[osm[1] as 'n' | 'w' | 'r']}-${osm[2]}`;
  if (!/^[A-Za-z0-9_-]{22}$/.test(code)) return null;
  const hex = Array.from(atob(code.replaceAll('-', '+').replaceAll('_', '/') + '=='), (byte) => byte.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return stationShareCode(id) === code ? id : null;
}

export function trackedStationUrl(origin: string, stationId: string) {
  const url = new URL(`/stations/${encodeURIComponent(stationId)}`, origin);
  url.searchParams.set('utm_source', 'whatsapp');
  url.searchParams.set('utm_medium', 'share');
  url.searchParams.set('utm_campaign', 'station_status');
  return url.toString();
}

export function stationShareUrl(origin: string, stationId: string) {
  const code = stationShareCode(stationId);
  return code ? new URL(`/s/${code}`, origin).toString() : trackedStationUrl(origin, stationId);
}

export function fuelShareLabel(station: Station, fuel: 'petrol' | 'diesel', now = Date.now()) {
  const reported = station[`${fuel}_reported_at`];
  const status = station[`${fuel}_status`];
  if (!reported || !status || status === 'unknown') return 'Unknown';
  const age = now - Date.parse(reported);
  if (!Number.isFinite(age) || age >= 4 * 60 * 60 * 1000 || station[`${fuel}_is_stale`]) return 'Stale — check before travelling';
  return status === 'available' ? 'Fuel available' : status === 'out' ? 'Out of fuel' : status === 'low' ? 'Running low' : 'Unknown';
}

export async function stationShareCard(station: Station, url: string): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200; canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image unavailable');
  ctx.fillStyle = '#fbf8f1'; ctx.fillRect(0, 0, 1200, 630);
  ctx.fillStyle = '#06452f'; ctx.fillRect(0, 0, 1200, 105);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 46px sans-serif'; ctx.fillText('ALIPO · Malawi fuel updates', 50, 70);
  ctx.fillStyle = '#06452f'; ctx.font = 'bold 46px sans-serif'; ctx.fillText(station.name, 50, 180, 1100);
  ctx.font = '30px sans-serif'; ctx.fillText(`${station.district}, ${station.city}`, 50, 230, 1100);
  for (const [index, fuel] of Array.from((['petrol', 'diesel'] as const).entries())) {
    const top = 310 + index * 100;
    ctx.font = 'bold 32px sans-serif'; ctx.fillText(`${fuel.toUpperCase()}: ${fuelShareLabel(station, fuel)}`, 50, top, 1100);
    ctx.font = '24px sans-serif';
    const reported = station[`${fuel}_reported_at`];
    ctx.fillText(reported ? `Reported ${new Date(reported).toLocaleString('en-GB', { timeZone: 'Africa/Blantyre' })} CAT` : 'No recent community report', 50, top + 38, 1100);
  }
  ctx.font = '22px sans-serif'; ctx.fillText('Community reports can change. Check the latest status before travelling.', 50, 535, 1100);
  ctx.fillText(url, 50, 585, 1100);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Image unavailable')), 'image/png'));
  return new File([blob], 'alipo-fuel-status.png', { type: 'image/png' });
}
