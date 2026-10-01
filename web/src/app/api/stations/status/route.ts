import { NextResponse } from 'next/server';
import { createSupabasePublicClient, createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createSupabasePublicClient();
  if (!supabase) {
    return NextResponse.json({ statuses: [], error: 'Supabase not configured' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('stations')
    .select('id,verified,latest_status,latest_queue,last_reported_at,petrol_status,diesel_status,petrol_reported_at,diesel_reported_at,updated_at')
    .eq('active', true);

  if (error) {
    console.error('Failed to fetch station statuses:', error);
    return NextResponse.json({ statuses: [], error: 'Failed to fetch station statuses' }, { status: 502 });
  }

  const admin = createSupabaseAdminClient();
  const counts = admin ? await admin.rpc('station_fuel_report_counts') : null;
  const evidence = admin ? await admin.rpc('station_fuel_evidence_summary') : null;
  type Evidence = { id: string; petrol_reports: number; diesel_reports: number; needs_location_confirmation: boolean };
  const evidenceById = new Map<string, Evidence>();
  for (const row of (evidence?.data || []) as Evidence[]) evidenceById.set(row.id, row);
  if (counts?.error) console.error('Failed to fetch fuel report counts:', counts.error);
  type FuelCounts = { id: string; petrol_confirmations: number; diesel_confirmations: number };
  const byId = new Map<string, FuelCounts>();
  for (const row of (counts?.data || []) as FuelCounts[]) byId.set(row.id, row);
  const statuses = (data || []).map((row) => {
    const votes = byId.get(row.id);
    return { ...row, ...votes, ...evidenceById.get(row.id),
      petrol_confidence: (votes?.petrol_confirmations || 0) >= 2 ? 0.8 : 0.5,
      diesel_confidence: (votes?.diesel_confirmations || 0) >= 2 ? 0.8 : 0.5,
    };
  });
  return NextResponse.json(
    { statuses, total: statuses.length },
    { headers: { 'Cache-Control': 'no-store', 'CDN-Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store' } },
  );
}
