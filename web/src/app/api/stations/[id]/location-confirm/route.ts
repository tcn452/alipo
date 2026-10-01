import { createHash } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(params.id)) return Response.json({ error: 'Invalid station.' }, { status: 400 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const phone = typeof body?.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
  if (phone.length < 7 || phone.length > 15 || body?.latitude == null || body?.longitude == null || body?.accuracy == null || ![body.latitude,body.longitude,body.accuracy].every((value) => typeof value === 'number' && Number.isFinite(value))) return Response.json({ error: 'Enter your phone number and enable location while at the station.' }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  const salt = process.env.REPORTER_HASH_SALT || process.env.SUPABASE_SECRET_KEY;
  if (!supabase || !salt) return Response.json({ error: 'Location voting is unavailable.' }, { status: 503 });
  const { data, error } = await supabase.rpc('submit_station_location_vote', { p_station_id: params.id, p_latitude: body.latitude, p_longitude: body.longitude, p_accuracy: body.accuracy, p_fingerprint: createHash('sha256').update(`${salt}:${phone}`).digest('hex') });
  if (error) return Response.json({ error: error.message.includes('Another visitor') ? 'Another visitor must confirm this location.' : 'Confirm while at the station with accurate location enabled.' }, { status: 422 });
  return Response.json({ votes: data, confirmed: Number(data) >= 2 });
}
