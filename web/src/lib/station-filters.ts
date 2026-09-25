import type { Station } from '../types/alipo';

export type FuelFilter = 'all' | 'petrol' | 'diesel';
export type StatusFilter = 'all' | 'has-fuel' | 'available' | 'low' | 'out';
export type FreshnessFilter = 'all' | 'recent' | 'older';

export interface ReportFilters {
  status: StatusFilter;
  freshness: FreshnessFilter;
}

export const REPORT_FRESHNESS_MS = 4 * 60 * 60 * 1000;

// Apply status and age to the SAME fuel report, never the station-wide latest status.
export function matchesStationFilters(
  station: Station,
  fuel: FuelFilter,
  filters: ReportFilters,
  search = '',
  now = Date.now(),
): boolean {
  const query = search.trim().toLocaleLowerCase();
  if (query && ![station.name, station.district, station.city, station.brand]
    .some((value) => value.toLocaleLowerCase().includes(query))) return false;

  const fuels = fuel === 'all' ? station.fuel_types : station.fuel_types.filter((type) => type === fuel);
  if (!fuels.length) return false;
  if (filters.status === 'all' && filters.freshness === 'all') return true;

  return fuels.some((type) => {
    const status = station[`${type}_status`];
    const reportedAt = station[`${type}_reported_at`];
    const timestamp = reportedAt ? Date.parse(reportedAt) : NaN;
    const age = now - timestamp;
    const older = Boolean(station[`${type}_is_stale`]) || status === 'stale' || age >= REPORT_FRESHNESS_MS;
    const recent = !older && Number.isFinite(age) && age >= 0 && age < REPORT_FRESHNESS_MS
      && status !== undefined && status !== 'unknown';

    if (filters.status === 'has-fuel') return recent && (status === 'available' || status === 'low');
    if (filters.status !== 'all' && status !== filters.status) return false;
    if (filters.freshness === 'recent') return recent;
    if (filters.freshness === 'older') return older;
    return true;
  });
}
