import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { pushConfigured, validPushEndpoint } from '@/lib/push-server';

export const dynamic = 'force-dynamic';
const COOKIE = 'alipo-push-owner';
const ownerHash = (token: string) => createHash('sha256').update(token).digest('hex');
const sameOrigin = (request: Request) => request.headers.get('origin') === new URL(request.url).origin;

export async function GET() {
  if (!pushConfigured() || !createSupabaseAdminClient()) return Response.json({ error: 'Fuel alerts are not configured.' }, { status: 503 });
  return Response.json({ publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid origin.' }, { status: 403 });
  const supabase = createSupabaseAdminClient();
  if (!supabase || !pushConfigured()) return Response.json({ error: 'Fuel alerts are not configured.' }, { status: 503 });
  const body = await request.json().catch(() => null);
  const subscription = body?.subscription;
  const ids = body?.station_ids;
  if (!validPushEndpoint(subscription?.endpoint) || !/^[A-Za-z0-9_-]{87}$/.test(subscription?.keys?.p256dh || '') || !/^[A-Za-z0-9_-]{22}$/.test(subscription?.keys?.auth || '') || !Array.isArray(ids) || ids.length > 50 || ids.some((id) => typeof id !== 'string' || !/^(?:[0-9a-f-]{36}|osm-(?:node|way|relation)-\d+)$/.test(id))) {
    return Response.json({ error: 'Invalid subscription or saved stations.' }, { status: 400 });
  }
  let token = cookies().get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) token = randomBytes(32).toString('hex');
  const hash = ownerHash(token);
  const endpointHash = ownerHash(subscription.endpoint);
  const { data: existing, error: lookupError } = await supabase.from('fuel_push_subscriptions').select('owner_hash, station_ids, last_status').eq('endpoint_hash', endpointHash).maybeSingle();
  if (lookupError) return Response.json({ error: 'Unable to save alerts.' }, { status: 502 });
  if (existing && existing.owner_hash !== hash) return Response.json({ error: 'This subscription belongs to another device session.' }, { status: 409 });
  // Re-baseline newly saved stations so saving never sends a stale "fuel returned" notification.
  const { data: stations, error: stationError } = await supabase.from('stations').select('id,osm_type,osm_id,petrol_status,diesel_status,petrol_reported_at,diesel_reported_at').eq('active', true);
  if (stationError) return Response.json({ error: 'Unable to load saved station status.' }, { status: 502 });
  const lastStatus: Record<string, string> = {};
  for (const station of stations || []) {
    const refs = [station.id, `osm-${station.osm_type}-${station.osm_id}`];
    if (!refs.some((ref) => ids.includes(ref))) continue;
    lastStatus[station.id] = existing?.last_status?.[station.id] || `${station.petrol_status}:${station.diesel_status}`;
  }
  const { error } = await supabase.from('fuel_push_subscriptions').upsert({ endpoint_hash: endpointHash, owner_hash: hash, subscription: { endpoint: subscription.endpoint, keys: subscription.keys }, station_ids: Array.from(new Set(ids)), last_status: lastStatus, updated_at: new Date().toISOString() });
  if (error) return Response.json({ error: 'Unable to save alerts.' }, { status: 502 });
  cookies().set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/push', maxAge: 365 * 24 * 60 * 60 });
  return Response.json({ success: true });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid origin.' }, { status: 403 });
  const token = cookies().get(COOKIE)?.value;
  const supabase = createSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'Fuel alerts unavailable.' }, { status: 503 });
  if (token) {
    const { error } = await supabase.from('fuel_push_subscriptions').delete().eq('owner_hash', ownerHash(token));
    if (error) return Response.json({ error: 'Unable to disable alerts.' }, { status: 502 });
  }
  return Response.json({ success: true });
}
