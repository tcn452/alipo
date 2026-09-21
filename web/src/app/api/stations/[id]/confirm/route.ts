import { createHash } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FUELS = new Set(['petrol', 'diesel']);

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!UUID_PATTERN.test(params.id)) return Response.json({ error: 'This station has no report to confirm yet.' }, { status: 400 });
  const body = await request.json().catch(() => null) as { fuel_type?: string; device_token?: string } | null;
  if (!body?.fuel_type || !FUELS.has(body.fuel_type) || !body.device_token || body.device_token.length < 16 || body.device_token.length > 200) {
    return Response.json({ error: 'A valid confirmation is required.' }, { status: 400 });
  }
  const salt = process.env.REPORTER_HASH_SALT || process.env.SUPABASE_SECRET_KEY;
  const supabase = createSupabaseAdminClient();
  if (!supabase || !salt) return Response.json({ error: 'Confirmations are temporarily unavailable.' }, { status: 503 });

  const { data: report, error: reportError } = await supabase
    .from('fuel_reports')
    .select('id,confirmations,confidence,status,fuel_type')
    .eq('station_id', params.id)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .in('fuel_type', [body.fuel_type, 'both'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (reportError) return Response.json({ error: 'Unable to find the latest report.' }, { status: 502 });
  if (!report) return Response.json({ error: 'There is no recent report to confirm.' }, { status: 404 });

  const fingerprint = createHash('sha256').update(`${salt}:${body.device_token}`).digest('hex');
  const { error: confirmationError } = await supabase.from('report_confirmations').insert({ report_id: report.id, reporter_fingerprint: fingerprint });
  if (confirmationError?.code === '23505') return Response.json({ error: 'You already confirmed this report.' }, { status: 409 });
  if (confirmationError) return Response.json({ error: 'Unable to save your confirmation.' }, { status: 502 });

  const confirmations = report.confirmations + 1;
  const confidence = Math.min(0.95, Number(report.confidence) + 0.1);
  const { error: updateError } = await supabase.from('fuel_reports').update({ confirmations, confidence }).eq('id', report.id);
  if (updateError) return Response.json({ error: 'Unable to update report confidence.' }, { status: 502 });
  const stationUpdate = body.fuel_type === 'petrol'
    ? { petrol_confirmations: confirmations, petrol_confidence: confidence }
    : { diesel_confirmations: confirmations, diesel_confidence: confidence };
  await supabase.from('stations').update(stationUpdate).eq('id', params.id);

  return Response.json({ success: true, confirmations, confidence });
}
