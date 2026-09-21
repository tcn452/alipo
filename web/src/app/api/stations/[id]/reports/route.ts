import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!UUID_PATTERN.test(params.id)) return Response.json({ reports: [] });
  const supabase = createSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'Report history is temporarily unavailable.' }, { status: 503 });

  const { data, error } = await supabase
    .from('fuel_reports')
    .select('id,status,fuel_type,queue_estimate,source,confirmations,confidence,created_at')
    .eq('station_id', params.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) return Response.json({ error: 'Unable to load report history.' }, { status: 502 });
  const staleBefore = Date.now() - 4 * 60 * 60 * 1000;
  const reports = (data || []).map((report) => ({
    ...report,
    is_stale: new Date(report.created_at).getTime() <= staleBefore,
  }));
  return Response.json({ reports }, { headers: { 'Cache-Control': 'private, max-age=30' } });
}
