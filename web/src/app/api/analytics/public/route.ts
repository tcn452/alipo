import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return Response.json({ error: 'Usage summary is unavailable.' }, { status: 503 });
  }

  const since = new Date(Date.now() - 30 * 86_400_000);
  const [{ data: usage, error: usageError }, { count: reports, error: reportsError }] = await Promise.all([
    supabase
      .from('app_usage_daily')
      .select('visitor_hash,channel')
      .gte('usage_date', since.toISOString().slice(0, 10))
      .limit(10_000),
    supabase
      .from('report_analytics')
      .select('report_id', { count: 'exact', head: true })
      .gte('created_at', since.toISOString()),
  ]);

  if (usageError || reportsError) {
    return Response.json({ error: 'Usage summary is unavailable.' }, { status: 502 });
  }

  return Response.json(
    {
      users30Days: new Set((usage || []).map((row) => row.visitor_hash)).size,
      reports30Days: reports || 0,
      pwaUsers30Days: new Set(
        (usage || []).filter((row) => row.channel === 'pwa').map((row) => row.visitor_hash),
      ).size,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } },
  );
}
