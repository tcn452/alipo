export const CITIES = [
  'All Cities',
  'Lilongwe',
  'Blantyre',
  'Mzuzu',
  'Zomba',
  'Kasungu',
  'Mangochi',
  'Salima'
] as const;

export const CITY_CENTERS: Record<string, [number, number]> = {
  'All Cities': [-13.2543, 34.3015],
  Lilongwe: [-13.9626, 33.7741],
  Blantyre: [-15.7861, 35.0058],
  Mzuzu: [-11.4589, 34.0152],
  Zomba: [-15.3833, 35.3333],
  Kasungu: [-13.0333, 33.4833],
  Mangochi: [-14.4781, 35.2645],
  Salima: [-13.7804, 34.4587],
};

// Initial map location when the user has not shared device location.
export const DEFAULT_CITY = 'Lilongwe';
export const DEFAULT_LOCATION: [number, number] = CITY_CENTERS[DEFAULT_CITY];

export const BRANDS = [
  'All Brands',
  'Puma',
  'Total',
  'Petroda',
  'OilCom',
  'Mount Meru',
  'Engen'
] as const;

const BRAND_COLORS: Record<string, string> = {
  puma: '#ef3f36',
  total: '#ed1b2f',
  totalenergies: '#e3268e',
  petroda: '#1464a5',
  oilcom: '#f28c28',
  'mount meru': '#2f7d32',
  engen: '#005daa',
  meru: '#2f7d32',
};

const BRAND_COLOR_PALETTE = ['#6d4c9f', '#087e8b', '#c65d21', '#447a3c', '#a23b72', '#2f6690', '#9a6b16', '#5f6f52'];

const BRAND_PATTERNS: ReadonlyArray<{ brand: string; pattern: RegExp }> = [
  { brand: 'TotalEnergies', pattern: /\btotal(?:\s*energies)?\b/i },
  { brand: 'Mount Meru', pattern: /\b(?:mount|mt)\.?\s+m(?:e{1,2})ru\b|\bmeru\b/i },
  { brand: 'Puma', pattern: /\bpuma\b/i },
  { brand: 'Petroda', pattern: /\bpetroda\b/i },
  { brand: 'OilCom', pattern: /\boil\s*com\b/i },
  { brand: 'Engen', pattern: /\bengen\b/i },
  { brand: 'BP', pattern: /\bbp\b/i },
  { brand: 'Shell', pattern: /\bshell\b/i },
  { brand: 'Caltex', pattern: /\bcaltex\b/i },
];

export function classifyStationBrand(name: string, reportedBrand?: string) {
  const evidence = `${name} ${reportedBrand || ''}`;
  const matched = BRAND_PATTERNS.find(({ pattern }) => pattern.test(evidence));
  if (matched) return matched.brand;
  const cleaned = reportedBrand?.trim();
  if (cleaned && !/^(independent|unknown|fuel\s*station)$/i.test(cleaned)) return cleaned;
  return 'Independent';
}

export function getBrandColor(brand: string) {
  const normalized = brand.trim().toLowerCase();
  if (BRAND_COLORS[normalized]) return BRAND_COLORS[normalized];
  const hash = Array.from(normalized || 'independent').reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 0);
  return BRAND_COLOR_PALETTE[hash % BRAND_COLOR_PALETTE.length];
}

export const FUEL_TYPES = [
  { label: 'All Types', value: 'all' },
  { label: 'Petrol', value: 'petrol' },
  { label: 'Diesel', value: 'diesel' }
] as const;

export const QUEUE_LABELS: Record<string, { label: string; color: string; duration: string }> = {
  none: { label: 'No Queue', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', duration: '<5 min' },
  short: { label: 'Short Queue', color: 'bg-blue-50 text-blue-700 border-blue-200', duration: '5-15 min' },
  medium: { label: 'Medium Queue', color: 'bg-amber-50 text-amber-700 border-amber-200', duration: '15-45 min' },
  long: { label: 'Long Queue', color: 'bg-red-50 text-red-700 border-red-200', duration: '>45 min' }
};

export const STATUS_CONFIG: Record<string, { label: string; color: string; badge: string; dot: string }> = {
  available: {
    label: 'Fuel Available',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-300',
    badge: 'bg-emerald-500 text-white',
    dot: 'bg-emerald-500'
  },
  low: {
    label: 'Low Supply',
    color: 'text-amber-600 bg-amber-50 border-amber-300',
    badge: 'bg-amber-500 text-white',
    dot: 'bg-amber-500'
  },
  out: {
    label: 'Out of Fuel',
    color: 'text-rose-600 bg-rose-50 border-rose-300',
    badge: 'bg-rose-500 text-white',
    dot: 'bg-rose-500'
  },
  unknown: {
    label: 'Awaiting Report',
    color: 'text-gray-500 bg-gray-50 border-gray-300',
    badge: 'bg-gray-400 text-white',
    dot: 'bg-gray-400'
  },
  stale: {
    label: 'Stale Report',
    color: 'text-[#795548] bg-[#f3ece8] border-[#cbb8ae]',
    badge: 'bg-[#795548] text-white',
    dot: 'bg-[#795548]'
  }
};

export type StationStockStatus = 'out_of_fuel' | 'petrol_only' | 'diesel_only' | 'fuel_in_stock';

export const STATION_STOCK_CONFIG: Record<StationStockStatus, { label: string; color: string }> = {
  out_of_fuel: { label: 'Out of fuel', color: 'text-rose-700 bg-rose-50 border-rose-300' },
  petrol_only: { label: 'Petrol only', color: 'text-orange-700 bg-orange-50 border-orange-300' },
  diesel_only: { label: 'Diesel only', color: 'text-blue-700 bg-blue-50 border-blue-300' },
  fuel_in_stock: { label: 'Fuel in stock', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
};

export function getStationStockStatus(station: {
  petrol_status?: string;
  diesel_status?: string;
}): StationStockStatus | null {
  const petrolInStock = station.petrol_status === 'available' || station.petrol_status === 'low';
  const dieselInStock = station.diesel_status === 'available' || station.diesel_status === 'low';

  if (petrolInStock && dieselInStock) return 'fuel_in_stock';
  if (petrolInStock) return 'petrol_only';
  if (dieselInStock) return 'diesel_only';
  if (station.petrol_status === 'out' && station.diesel_status === 'out') return 'out_of_fuel';
  return null;
}
