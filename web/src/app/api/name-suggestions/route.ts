import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'Supabase server credentials are not configured.' }, { status: 503 });

  const { data, error } = await supabase
    .from('stations')
    .select('id,name,brand,district,city,fuel_types,suggested_name,name_suggestion_count')
    .eq('active', true)
    .not('suggested_name', 'is', null)
    .lt('name_suggestion_count', 2)
    .order('updated_at', { ascending: false });

  if (error) return Response.json({ error: 'Unable to load suggested names.' }, { status: 502 });

  const suggestions = (data || []).flatMap((row) => {
    if (!row.suggested_name) return [];
    return [{
      station: {
        id: row.id,
        name: row.name,
        brand: row.brand || 'Independent',
        latitude: 0,
        longitude: 0,
        district: row.district || row.city || 'Malawi',
        city: row.city || 'Malawi',
        fuel_types: row.fuel_types || ['petrol', 'diesel'],
      },
      suggested_name: row.suggested_name,
      votes: row.name_suggestion_count,
    }];
  });

  return Response.json({ suggestions }, { headers: { 'Cache-Control': 'no-store' } });
}
