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

export const BRANDS = [
  'All Brands',
  'Puma',
  'Total',
  'Petroda',
  'OilCom',
  'Mount Meru',
  'Engen'
] as const;

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
