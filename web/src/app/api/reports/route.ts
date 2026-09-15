import { createHash } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

const STATUSES = new Set(['available', 'low', 'out']);
const FUEL_TYPES = new Set(['petrol', 'diesel', 'both']);
const QUEUES = new Set(['none', 'short', 'medium', 'long']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OSM_ID_PATTERN = /^osm-(node|way|relation)-(\d+)$/;

interface ReportRequest {
  station?: {
    id?: string;
    name?: string;
    brand?: string;
    latitude?: number;
    longitude?: number;
    district?: string;
    city?: string;
    fuel_types?: string[];
  };
  report_type?: 'fuel' | 'missing_station';
  status?: string;
  fuel_type?: string;
  queue_estimate?: string;
  phone?: string;
}

export async function POST(request: Request) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return Response.json({ error: 'Supabase server credentials are not configured.' }, { status: 503 });

  const body = await request.json().catch(() => null) as ReportRequest | null;
  if (!body) return Response.json({ error: 'A valid report is required.' }, { status: 400 });
  const station = body.station;
  if (!station?.id || !station.name || !Number.isFinite(station.latitude) || !Number.isFinite(station.longitude)) {
    return Response.json({ error: 'A valid station is required.' }, { status: 400 });
  }
  const reportType = body.report_type || 'fuel';
  if (reportType !== 'fuel' && reportType !== 'missing_station') {
    return Response.json({ error: 'The report type is invalid.' }, { status: 400 });
  }
  if (reportType === 'fuel' && (!body.status || !STATUSES.has(body.status) || !body.fuel_type || !FUEL_TYPES.has(body.fuel_type))) {
    return Response.json({ error: 'The report status or fuel type is invalid.' }, { status: 400 });
  }
  if (body.queue_estimate && !QUEUES.has(body.queue_estimate)) {
    return Response.json({ error: 'The queue estimate is invalid.' }, { status: 400 });
  }

  let stationId = UUID_PATTERN.test(station.id) ? station.id : null;
  if (stationId) {
    const { data } = await supabase.from('stations').select('id').eq('id', stationId).maybeSingle();
    stationId = data?.id || null;
  }

  if (!stationId) {
    const osmIdentity = station.id.match(OSM_ID_PATTERN);
    if (!osmIdentity) return Response.json({ error: 'This mapped station cannot be identified.' }, { status: 400 });

    const { data, error } = await supabase
      .from('stations')
      .upsert({
        osm_type: osmIdentity[1],
        osm_id: Number(osmIdentity[2]),
        name: station.name.slice(0, 200),
        brand: (station.brand || 'Independent').slice(0, 120),
        location: `POINT(${station.longitude} ${station.latitude})`,
        district: station.district?.slice(0, 160) || null,
        city: station.city?.slice(0, 120) || null,
        fuel_types: (station.fuel_types || ['petrol', 'diesel']).filter((type) => type === 'petrol' || type === 'diesel'),
        osm_synced_at: new Date().toISOString(),
        active: true,
      }, { onConflict: 'osm_type,osm_id' })
      .select('id')
      .single();
    if (error) return Response.json({ error: 'Unable to register the mapped station.' }, { status: 502 });
    stationId = data.id;
  }

  const phone = body.phone?.trim();
  const hashSalt = process.env.REPORTER_HASH_SALT;
  const reporterPhoneHash = phone && hashSalt
    ? createHash('sha256').update(`${hashSalt}:${phone}`).digest('hex')
    : null;
  if (reportType === 'missing_station') {
    if (!phone) return Response.json({ error: 'A phone number is required for a missing-station report.' }, { status: 400 });
    const fingerprintSalt = hashSalt || process.env.SUPABASE_SECRET_KEY;
    if (!fingerprintSalt) return Response.json({ error: 'Missing-station reporting is temporarily unavailable.' }, { status: 503 });
    const reporterFingerprint = createHash('sha256').update(`${fingerprintSalt}:${phone.replace(/\s+/g, '')}`).digest('hex');
    const { error: absenceError } = await supabase.from('station_absence_reports').insert({
      station_id: stationId,
      reporter_fingerprint: reporterFingerprint,
      source: 'web',
    });
    if (absenceError?.code === '23505') return Response.json({ error: 'You have already reported this station.' }, { status: 409 });
    if (absenceError) return Response.json({ error: 'Unable to save the missing-station report.' }, { status: 502 });
    return Response.json({ success: true, station_id: stationId }, { status: 201 });
  }

  const { error } = await supabase.from('fuel_reports').insert({
    station_id: stationId,
    status: body.status,
    fuel_type: body.fuel_type,
    queue_estimate: body.queue_estimate || null,
    source: 'web',
    reporter_phone_hash: reporterPhoneHash,
    confirmations: 1,
    confidence: 0.5,
    is_active: true,
    expires_at: new Date(Date.now() + (body.status === 'out' ? 6 : 3) * 60 * 60 * 1000).toISOString(),
  });

  if (error) return Response.json({ error: 'Unable to save the fuel report.' }, { status: 502 });
  return Response.json({ success: true, station_id: stationId }, { status: 201 });
}
