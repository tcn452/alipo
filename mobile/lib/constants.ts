export const CITIES = [
  'All Cities',
  'Lilongwe',
  'Blantyre',
  'Mzuzu',
  'Zomba'
] as const;

export const BRANDS = [
  'All Brands',
  'Puma',
  'Total',
  'Petroda',
  'OilCom',
  'Mount Meru'
] as const;

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; text: string; dot: string }> = {
  available: {
    label: 'Available',
    color: '#16a34a',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500'
  },
  low: {
    label: 'Low Supply',
    color: '#ca8a04',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500'
  },
  out: {
    label: 'Out of Fuel',
    color: '#dc2626',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    dot: 'bg-rose-500'
  },
  unknown: {
    label: 'Expired',
    color: '#6b7280',
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    dot: 'bg-gray-400'
  }
};

export const QUEUE_LABELS: Record<string, { label: string; duration: string }> = {
  none: { label: 'No Queue', duration: '<5m' },
  short: { label: 'Short', duration: '5-15m' },
  medium: { label: 'Medium', duration: '15-45m' },
  long: { label: 'Long', duration: '>45m' }
};
