import type { Station } from '../types/alipo';
import { fuelShareLabel, shareReportTime } from './station-share';

export type AreaFuel = 'petrol' | 'diesel';
const northern = ['chitipa', 'karonga', 'likoma', 'mzimba', 'mzuzu', 'nkhata bay', 'rumphi'];
const central = ['dedza', 'dowa', 'kasungu', 'lilongwe', 'mchinji', 'nkhotakota', 'ntcheu', 'ntchisi', 'salima'];
const southern = ['balaka', 'blantyre', 'chikwawa', 'chiradzulu', 'machinga', 'mangochi', 'mulanje', 'mwanza', 'neno', 'nsanje', 'phalombe', 'thyolo', 'zomba'];
export const SHARE_AREAS = [
  { id: 'all', name: 'All Malawi' },
  { id: 'northern', name: 'Northern Malawi' },
  { id: 'central', name: 'Central Malawi' },
  { id: 'southern', name: 'Southern Malawi' },
  { id: 'lilongwe', name: 'Lilongwe', center: [-13.9626, 33.7741] },
  { id: 'blantyre', name: 'Blantyre', center: [-15.7861, 35.0058] },
  { id: 'mzuzu', name: 'Mzuzu', center: [-11.4589, 34.0152] },
  { id: 'zomba', name: 'Zomba', center: [-15.3833, 35.3333] },
  { id: 'kasungu', name: 'Kasungu', center: [-13.0333, 33.4833] },
  { id: 'mangochi', name: 'Mangochi', center: [-14.4781, 35.2645] },
  { id: 'salima', name: 'Salima', center: [-13.7804, 34.4587] },
] as const;
export function shareArea(id: string) { return SHARE_AREAS.find((area) => area.id === id); }
export function validAreaFuel(fuel: string): fuel is AreaFuel { return fuel === 'petrol' || fuel === 'diesel'; }
export function areaIdForCity(city: string) { return SHARE_AREAS.find((area) => area.name.toLowerCase() === city.toLowerCase())?.id || 'all'; }
export function areaShareUrl(origin: string, area: string, fuel: AreaFuel) {
  if (!shareArea(area) || !validAreaFuel(fuel)) throw new Error('Invalid area report');
  return new URL(`/r/${area}/${fuel}`, origin).toString();
}
export function trackedAreaUrl(origin: string, area: string, fuel: AreaFuel) {
  const url = new URL(`/a/${area}/${fuel}`, origin);
  url.searchParams.set('utm_source', 'whatsapp'); url.searchParams.set('utm_medium', 'share'); url.searchParams.set('utm_campaign', 'area_report');
  return url.toString();
}
const wordsMatch = (location: string, name: string) => ` ${location.replace(/[^a-z ]/g, ' ')} `.includes(` ${name} `);
export function stationInShareArea(station: Station, id: string): boolean {
  const area = shareArea(id);
  if (!area) return false;
  if (id === 'all') return true;
  const location = `${station.city} ${station.district}`.toLowerCase();
  const districts = id === 'northern' ? northern : id === 'central' ? central : id === 'southern' ? southern : null;
  if (districts) return districts.some((name) => wordsMatch(location, name)) || SHARE_AREAS.some((city) => 'center' in city && districts.includes(city.id) && stationInShareArea(station, city.id));
  if (wordsMatch(location, area.name.toLowerCase())) return true;
  // Include nearby stations whose directory city is missing/generic. Named city
  // reports cover the city and a 20 km radius around its public centre, never GPS.
  if (!('center' in area) || !Number.isFinite(station.latitude) || !Number.isFinite(station.longitude)) return false;
  const radians = (value: number) => value * Math.PI / 180;
  const dlat = radians(station.latitude - area.center[0]), dlon = radians(station.longitude - area.center[1]);
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(radians(area.center[0])) * Math.cos(radians(station.latitude)) * Math.sin(dlon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) <= 20;
}
export function areaFuelState(station: Station, fuel: AreaFuel, now = Date.now()) {
  const status = station[`${fuel}_status`];
  const timestamp = Date.parse(station[`${fuel}_reported_at`] || '');
  if (!status || status === 'unknown' || !Number.isFinite(timestamp)) return 'unknown';
  if (status === 'stale' || station[`${fuel}_is_stale`] || now - timestamp >= 4 * 3_600_000 || timestamp > now) return 'stale';
  return status === 'available' || status === 'low' ? 'available' : status === 'out' ? 'out' : 'unknown';
}
export function buildAreaReport(stations: Station[], areaId: string, fuel: AreaFuel, now = Date.now()) {
  const area = shareArea(areaId);
  if (!area || !validAreaFuel(fuel)) throw new Error('Invalid area report');
  const included = stations.filter((station) => stationInShareArea(station, areaId) && (!station.fuel_types?.length || station.fuel_types.includes(fuel))).map((station) => ({ ...station, [`${fuel}_is_stale`]: areaFuelState(station, fuel, now) === 'stale' }));
  const rank = { available: 0, out: 1, stale: 2, unknown: 3 };
  included.sort((a, b) => rank[areaFuelState(a, fuel, now)] - rank[areaFuelState(b, fuel, now)] || (Date.parse(b[`${fuel}_reported_at`] || '') || 0) - (Date.parse(a[`${fuel}_reported_at`] || '') || 0) || a.name.localeCompare(b.name));
  return { areaId, areaName: area.name, fuel, generatedAt: new Date(now).toISOString(), total: included.length,
    available: included.filter((station) => areaFuelState(station, fuel, now) === 'available').length,
    out: included.filter((station) => areaFuelState(station, fuel, now) === 'out').length,
    stale: included.filter((station) => areaFuelState(station, fuel, now) === 'stale').length,
    unknown: included.filter((station) => areaFuelState(station, fuel, now) === 'unknown').length,
    stations: included };
}
export type AreaReport = ReturnType<typeof buildAreaReport>;
export async function areaShareCard(report: AreaReport, url: string): Promise<File> {
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1100;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Image unavailable');
  const now = Date.parse(report.generatedAt);
  ctx.fillStyle = '#fbf8f1'; ctx.fillRect(0, 0, 1200, 1100);
  ctx.fillStyle = '#06452f'; ctx.fillRect(0, 0, 1200, 110);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 42px sans-serif'; ctx.fillText('ALIPO · Area fuel report', 50, 72);
  ctx.fillStyle = '#06452f'; ctx.font = 'bold 48px sans-serif'; ctx.fillText(`${report.areaName} · ${report.fuel === 'diesel' ? 'Diesel' : 'Petrol'}`, 50, 185, 1100);
  ctx.font = '26px sans-serif'; ctx.fillText(`${report.available} reporting fuel · ${report.out} out · ${report.stale} stale · ${report.unknown} unknown`, 50, 235, 1100);
  ctx.font = '22px sans-serif'; ctx.fillText(`Snapshot: ${shareReportTime(report.generatedAt, now).replace('Reported just now · ', '')}`, 50, 274, 1100);
  report.stations.slice(0, 6).forEach((station, index) => {
    const top = 335 + index * 98; const state = areaFuelState(station, report.fuel, now);
    ctx.fillStyle = state === 'available' ? '#06452f' : state === 'out' ? '#dc2626' : state === 'stale' ? '#795548' : '#66736d';
    ctx.font = 'bold 27px sans-serif'; ctx.fillText(station.name, 50, top, 1100);
    ctx.font = '23px sans-serif'; ctx.fillText(fuelShareLabel(station, report.fuel, now), 50, top + 30, 1100);
    ctx.fillStyle = '#66736d'; ctx.font = '20px sans-serif'; ctx.fillText(shareReportTime(station[`${report.fuel}_reported_at`], now), 50, top + 58, 1100);
  });
  if (!report.total) { ctx.font = '28px sans-serif'; ctx.fillText('No station reports found for this area and fuel.', 50, 350, 1100); }
  ctx.fillStyle = '#06452f'; ctx.font = '24px sans-serif'; ctx.fillText(report.total > 6 ? `Showing 6 of ${report.total} stations. Open Alipo for the full live report.` : 'Open Alipo for the latest reports and directions.', 50, 965, 1100);
  ctx.font = '22px sans-serif'; ctx.fillText('Stale reports are not current availability. Check before travelling.', 50, 1010, 1100);
  ctx.font = 'bold 26px sans-serif'; ctx.fillText(url, 50, 1060, 1100);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Image unavailable')), 'image/png'));
  return new File([blob], `alipo-${report.areaId}-${report.fuel}.png`, { type: 'image/png' });
}
