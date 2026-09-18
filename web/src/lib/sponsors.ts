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
];

export async function getActiveSponsors(placement: 'in_feed' | 'post_report' | 'banner' | 'all' = 'all', city = 'all'): Promise<Sponsor[]> {
  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from('sponsors')
        .select('*')
        .eq('is_active', true);

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        return data
          .map((row) => ({
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
          }))
          .filter((s) => {
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
