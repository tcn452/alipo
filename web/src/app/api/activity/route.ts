import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  const supabase = createSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'Activity unavailable.' }, { status: 503, headers });

  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // Count submissions, including reports that have since expired. Return no report details.
  const { count, error } = await supabase.from('fuel_reports')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since.toISOString())
    .lte('created_at', now.toISOString());

  if (error || count === null) return Response.json({ error: 'Activity unavailable.' }, { status: 502, headers });
  return Response.json({ reportsLast24Hours: count, asOf: now.toISOString() }, { headers });
}
