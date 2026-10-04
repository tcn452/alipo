import { timingSafeEqual } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { pushConfigured, sendFuelPush } from '@/lib/push-server';
import type { PushSubscription } from 'web-push';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.FUEL_ALERT_CRON_SECRET;
  const supplied = request.headers.get('authorization') || '';
  const expected = `Bearer ${secret || ''}`;
  if (!secret || supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  const supabase = createSupabaseAdminClient();
  if (!supabase || !pushConfigured()) return Response.json({ error: 'Fuel alerts unavailable.' }, { status: 503 });
  const now = new Date().toISOString();
  const [subscriptions, stations] = await Promise.all([
    supabase.from('fuel_push_subscriptions').select('*').lt('lease_until', now).order('last_checked_at').limit(100),
    supabase.from('stations').select('id,name,osm_type,osm_id,petrol_status,diesel_status,petrol_reported_at,diesel_reported_at').eq('active', true),
  ]);
  if (subscriptions.error || stations.error) return Response.json({ error: 'Unable to load alerts.' }, { status: 502 });
  let sent = 0; let failed = 0;
  const rows = subscriptions.data || [];
  // Bound concurrency and one combined notification per subscription per check.
  for (let offset = 0; offset < rows.length; offset += 10) {
    await Promise.all(rows.slice(offset, offset + 10).map(async (row) => {
      const lease = new Date(Date.now() + 120_000).toISOString();
      const { data: claimed, error: claimError } = await supabase.from('fuel_push_subscriptions').update({ lease_until: lease, last_checked_at: now }).eq('endpoint_hash', row.endpoint_hash).lt('lease_until', now).select('endpoint_hash').maybeSingle();
      if (claimError || !claimed) return;
      const next: Record<string, string> = {};
      const changed: { id: string; name: string; fuel: string }[] = [];
      for (const station of stations.data || []) {
        if (!row.station_ids.includes(station.id) && !row.station_ids.includes(`osm-${station.osm_type}-${station.osm_id}`)) continue;
        next[station.id] = `${station.petrol_status}:${station.diesel_status}`;
        const previous = (row.last_status[station.id] as string | undefined)?.split(':');
        if (!previous) continue;
        for (const [index, fuel] of Array.from((['petrol', 'diesel'] as const).entries())) {
          const time = Date.parse(station[`${fuel}_reported_at`] || '');
          if (station[`${fuel}_status`] === 'available' && previous[index] !== 'available' && Number.isFinite(time) && Date.now() - time < 4 * 60 * 60 * 1000) changed.push({ id: station.id, name: station.name, fuel });
        }
      }
      try {
        if (changed.length) {
          const first = changed[0];
          await sendFuelPush(row.subscription as PushSubscription, { title: `Fuel at ${first.name}`, body: `${first.fuel === 'petrol' ? 'Petrol' : 'Diesel'} is reported available.${changed.length > 1 ? ` ${changed.length - 1} more saved-station fuel update(s).` : ''} Check the latest status before travelling.`, url: `/stations/${encodeURIComponent(first.id)}?utm_source=web_push&utm_medium=notification`, stationId: first.id });
          sent++;
        }
        const { error } = await supabase.from('fuel_push_subscriptions').update({ last_status: next, lease_until: now }).eq('endpoint_hash', row.endpoint_hash).eq('lease_until', lease);
        if (error) failed++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await supabase.from('fuel_push_subscriptions').delete().eq('endpoint_hash', row.endpoint_hash);
        else { failed++; await supabase.from('fuel_push_subscriptions').update({ lease_until: now }).eq('endpoint_hash', row.endpoint_hash).eq('lease_until', lease); }
        console.error(JSON.stringify({ event: 'fuel_push_failed', status: status || 0 }));
      }
    }));
  }
  console.info(JSON.stringify({ event: 'fuel_push_dispatch', checked: rows.length, sent, failed }));
  return Response.json({ checked: rows.length, sent, failed }, { status: failed ? 502 : 200 });
}
