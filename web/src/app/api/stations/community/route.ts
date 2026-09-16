import { createHash } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'Station submissions are temporarily unavailable.' }, { status: 503 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const brand = typeof body?.brand === 'string' ? body.brand.trim() : '';
  const city = typeof body?.city === 'string' ? body.city.trim() : '';
  const phone = typeof body?.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  const accuracy = Number(body?.accuracy);
  if (name.length < 2 || name.length > 200) return Response.json({ error: 'Enter a valid station name.' }, { status: 400 });
  if (phone.length < 7 || phone.length > 15) return Response.json({ error: 'Enter a valid phone number.' }, { status: 400 });
  if (![latitude, longitude, accuracy].every(Number.isFinite)) return Response.json({ error: 'Capture your live location at the station first.' }, { status: 400 });
  const salt = process.env.REPORTER_HASH_SALT || process.env.SUPABASE_SECRET_KEY;
  if (!salt) return Response.json({ error: 'Station submissions are temporarily unavailable.' }, { status: 503 });
  const fingerprint = createHash('sha256').update(`${salt}:${phone}`).digest('hex');
  const { data, error } = await supabase.rpc('create_community_station', {
    p_name: name, p_brand: brand || 'Independent', p_city: city || null,
    p_latitude: latitude, p_longitude: longitude, p_accuracy_m: accuracy,
    p_reporter_fingerprint: fingerprint,
  });
  if (error) {
    const message = error.message.includes('75 metres') ? 'A station already exists within 75 metres. Please use the existing station.'
      : error.message.includes('Malawi') ? 'Your captured location is outside Malawi.'
      : error.message.includes('accuracy') ? 'Move closer to the station and recapture a more accurate location.'
      : 'Unable to add this station.';
    return Response.json({ error: message }, { status: 422 });
  }
  return Response.json({ station_id: data }, { status: 201 });
}
