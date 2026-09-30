import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { Sponsor } from '@/types/alipo';

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
const SPONSOR_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function getActiveSponsors(placement: 'in_feed' | 'post_report' | 'banner' | 'all' = 'all', city = 'all'): Promise<Sponsor[]> {
  if (cachedSponsors && Date.now() < cacheExpiresAt) {
    return cachedSponsors.filter((s) => {
      const matchesPlacement = placement === 'all' || s.placement === 'all' || s.placement === placement;
      const matchesCity = city === 'all' || !s.city || s.city === 'all' || s.city.toLowerCase() === city.toLowerCase();
      return matchesPlacement && matchesCity;
    });
  }

  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from('sponsors')
        .select('*')
        .eq('is_active', true);

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        cachedSponsors = data.map((row) => ({
          id: String(row.id),
          name: String(row.name),
          tagline: row.tagline ? String(row.tagline) : undefined,
          description: row.description ? String(row.description) : undefined,
          category: row.category ? String(row.category) : undefined,
          cta_text: row.cta_text ? String(row.cta_text) : undefined,
          cta_url: String(row.cta_url),
          image_url: row.image_url ? String(row.image_url) : undefined,
          logo_url: row.logo_url ? String(row.logo_url) : undefined,
          phone: row.phone ? String(row.phone) : undefined,
          placement: (row.placement || 'all') as Sponsor['placement'],
          city: row.city ? String(row.city) : 'all',
          badge: row.badge ? String(row.badge) : undefined,
        }));
        cacheExpiresAt = Date.now() + SPONSOR_CACHE_TTL_MS;

        return cachedSponsors.filter((s) => {
          const matchesPlacement = placement === 'all' || s.placement === 'all' || s.placement === placement;
          const matchesCity = city === 'all' || !s.city || s.city === 'all' || s.city.toLowerCase() === city.toLowerCase();
          return matchesPlacement && matchesCity;
        });
      }
    } catch {
      // Fallback below
    }
  }

  return FALLBACK_SPONSORS.filter((s) => {
    const matchesPlacement = placement === 'all' || s.placement === 'all' || s.placement === placement;
    const matchesCity = city === 'all' || !s.city || s.city === 'all' || s.city.toLowerCase() === city.toLowerCase();
    return matchesPlacement && matchesCity;
  });
}
