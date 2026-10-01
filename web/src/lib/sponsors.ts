import { Sponsor } from '@/types/alipo';
import { trackCacheResponse } from '@/lib/gtag';
import { nextSponsor } from '@/lib/sponsor-rotation';

export const FALLBACK_SPONSORS: Sponsor[] = [
  {
    id: 'giants-travel-malawi',
    name: 'The Giants Travel',
    tagline: 'Awaken to a New World. Reliable flights, car rentals & airport transfers across Malawi.',
    description: 'Planning road trips, airport transfers, or global flights? Travel with Malawian locals who know the territory.',
    category: 'Travel & Transfers',
    cta_text: 'Explore Giants Travel',
    cta_url: 'https://giantstravel.com',
    phone: '+265999000000',
    placement: 'all',
    city: 'all',
    badge: 'Featured Partner',
  },
  {
    id: 'specials-blantyre',
    name: 'SPECIALS',
    tagline: 'Your Richly Empowered & Loving Store.',
    description: 'Your trusted fashion and beauty destination in the heart of Blantyre CBD. Discover a carefully selected range of clothes, shoes, handbags, beauty accessories, and more, with stylish, quality products at great value. Find us on Haile Selassie Avenue, in the same building as PEP & Sana, First Floor, Shop No. 11.',
    category: 'Fashion & Beauty',
    cta_text: 'Find SPECIALS',
    cta_url: 'https://www.google.com/maps/search/?api=1&query=Specials%2C+Haile+Selassie+Avenue%2C+Blantyre%2C+Malawi',
    placement: 'all',
    city: 'Blantyre',
    badge: 'Featured Partner',
  },
];

let cachedSponsors: Sponsor[] | null = null;
let cacheExpiresAt = 0;
let sponsorRequest: Promise<Sponsor[]> | null = null;
const SPONSOR_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function fetchSponsors() {
  const response = await fetch('/api/sponsors');
  trackCacheResponse('/api/sponsors', response);
  if (!response.ok) throw new Error('Sponsors unavailable');
  const payload = await response.json() as { sponsors?: Sponsor[] };
  return Array.isArray(payload.sponsors) ? payload.sponsors : [];
}

export async function getActiveSponsors(placement: 'in_feed' | 'post_report' | 'banner' | 'all' = 'all', _city = 'all'): Promise<Sponsor[]> {
  if (cachedSponsors && Date.now() < cacheExpiresAt) {
    return cachedSponsors.filter((s) => {
      const matchesPlacement = placement === 'all' || s.placement === 'all' || s.placement === placement;
      return matchesPlacement;
    });
  }

  try {
    sponsorRequest ||= fetchSponsors();
    const sponsors = await sponsorRequest;
    sponsorRequest = null;
    if (sponsors.length > 0) {
      cachedSponsors = sponsors;
      cacheExpiresAt = Date.now() + SPONSOR_CACHE_TTL_MS;
      return sponsors.filter((s) => {
        const matchesPlacement = placement === 'all' || s.placement === 'all' || s.placement === placement;
        return matchesPlacement;
      });
    }
  } catch {
    sponsorRequest = null;
  }

  return FALLBACK_SPONSORS.filter((s) => {
    const matchesPlacement = placement === 'all' || s.placement === 'all' || s.placement === placement;
    return matchesPlacement;
  });
}

let rotationOffset = 0;
export function pickNextSponsor(sponsors: Sponsor[], slot: string): Sponsor | null {
  const key = `alipo-sponsor-last-v1:${slot}`;
  let previousId: string | null = null;
  try { previousId = localStorage.getItem(key); } catch { /* Storage is optional. */ }
  const picked = nextSponsor(sponsors, previousId, rotationOffset++);
  if (picked) { try { localStorage.setItem(key, picked.id); } catch { /* Rotation still works in memory. */ } }
  return picked;
}
