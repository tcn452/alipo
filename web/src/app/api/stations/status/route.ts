import { NextResponse } from 'next/server';
import { publicCdnCacheHeaders } from '@/lib/cache-headers';
import { createSupabasePublicClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createSupabasePublicClient();
  if (!supabase) {
    return NextResponse.json({ statuses: [], error: 'Supabase not configured' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('stations')
    .select('id,latest_status,latest_queue,last_reported_at,petrol_status,diesel_status,petrol_reported_at,diesel_reported_at,updated_at')
    .eq('active', true);

  if (error) {
    console.error('Failed to fetch station statuses:', error);
    return NextResponse.json({ statuses: [], error: 'Failed to fetch station statuses' }, { status: 502 });
  }

  return NextResponse.json(
    { statuses: data || [], total: data?.length || 0 },
    { headers: publicCdnCacheHeaders(30, 120) },
  );
}
