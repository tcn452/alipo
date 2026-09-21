import { createHash } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { visitorId?: string; channel?: string } | null;
  if (!body?.visitorId || body.visitorId.length < 16 || body.visitorId.length > 200 || !['pwa', 'web'].includes(body.channel || '')) return Response.json({ error: 'Invalid analytics event.' }, { status: 400 });
  const salt = process.env.REPORTER_HASH_SALT || process.env.SUPABASE_SECRET_KEY;
  const supabase = createSupabaseAdminClient();
  if (!salt || !supabase) return Response.json({ error: 'Analytics unavailable.' }, { status: 503 });
  const visitorHash = createHash('sha256').update(`${salt}:analytics:${body.visitorId}`).digest('hex');
  const { error } = await supabase.rpc('record_app_usage', {
    p_visitor_hash: visitorHash,
    p_channel: body.channel,
  });
  if (error) return Response.json({ error: 'Unable to record usage.' }, { status: 502 });
  return new Response(null, { status: 204 });
}
