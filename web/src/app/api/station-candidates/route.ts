import { createHash } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const ACTIONS = new Set(['accept', 'reject', 'create']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'Supabase server credentials are not configured.' }, { status: 503 });

  const [{ data, error }, { data: votes, error: votesError }] = await Promise.all([
    supabase.rpc('station_candidate_review_queue'),
    supabase.from('station_candidate_votes').select('source,source_record_id,action'),
  ]);
  if (error) return Response.json({ error: 'Unable to load station candidates.' }, { status: 502 });
  if (votesError) return Response.json({ error: 'Unable to load station candidate votes.' }, { status: 502 });

  const voteCounts = new Map<string, { accept: number; create: number; reject: number }>();
  for (const vote of votes || []) {
    const key = `${vote.source}:${vote.source_record_id}`;
    const counts = voteCounts.get(key) || { accept: 0, create: 0, reject: 0 };
    const action = vote.action as 'accept' | 'create' | 'reject';
    if (action === 'accept' || action === 'create' || action === 'reject') counts[action] += 1;
    voteCounts.set(key, counts);
  }

  const candidates = (data || []).map((candidate: { source: string; source_record_id: string }) => ({
    ...candidate,
    vote_counts: voteCounts.get(`${candidate.source}:${candidate.source_record_id}`) || { accept: 0, create: 0, reject: 0 },
  }));
  return Response.json({ candidates }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'Supabase server credentials are not configured.' }, { status: 503 });

  const body = await request.json().catch(() => null) as {
    candidate_id?: number;
    action?: string;
    station_id?: string | null;
    phone?: string;
  } | null;

  if (!body || !Number.isSafeInteger(body.candidate_id) || !body.action || !ACTIONS.has(body.action)) {
    return Response.json({ error: 'A valid candidate action is required.' }, { status: 400 });
  }
  if (body.action === 'accept' && (!body.station_id || !UUID_PATTERN.test(body.station_id))) {
    return Response.json({ error: 'Choose an existing station for this candidate.' }, { status: 400 });
  }
  const normalizedPhone = body.phone?.replace(/\D/g, '') || '';
  if (normalizedPhone.length < 7 || normalizedPhone.length > 15) {
    return Response.json({ error: 'Enter a valid phone number to vote.' }, { status: 400 });
  }
  const hashSalt = process.env.REPORTER_HASH_SALT || process.env.SUPABASE_SECRET_KEY;
  if (!hashSalt) return Response.json({ error: 'Station voting is temporarily unavailable.' }, { status: 503 });
  const reporterFingerprint = createHash('sha256').update(`${hashSalt}:${normalizedPhone}`).digest('hex');

  const { data, error } = await supabase.rpc('submit_station_candidate_vote', {
    p_candidate_id: body.candidate_id,
    p_action: body.action,
    p_station_id: body.action === 'accept' ? body.station_id : null,
    p_reporter_fingerprint: reporterFingerprint,
  });

  if (error) {
    const safeMessage = error.message.includes('75 metres')
      ? 'An existing station is within 75 metres. Accept it instead of creating a duplicate.'
      : error.message.includes('no longer awaiting review')
        ? 'This candidate has already been reviewed.'
        : 'Unable to review this station candidate.';
    return Response.json({ error: safeMessage }, { status: error.message.includes('no longer awaiting review') ? 409 : 422 });
  }

  return Response.json({ result: data?.[0] || null });
}
