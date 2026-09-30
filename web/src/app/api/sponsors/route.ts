import { NextResponse } from 'next/server';
import { publicCdnCacheHeaders } from '@/lib/cache-headers';
import { createSupabasePublicClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createSupabasePublicClient();
  if (!supabase) {
    return NextResponse.json({ sponsors: [], error: 'Supabase not configured' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('sponsors')
    .select('id,name,tagline,description,category,cta_text,cta_url,image_url,logo_url,phone,placement,city,badge')
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${new Date().toISOString()}`)
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`);

  if (error) {
    console.error('Failed to fetch sponsors:', error);
    return NextResponse.json({ sponsors: [], error: 'Failed to fetch sponsors' }, { status: 502 });
  }

  return NextResponse.json(
    { sponsors: data || [] },
    { headers: publicCdnCacheHeaders(1_200, 3_600) },
  );
}
