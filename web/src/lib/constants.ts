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
  }
};
