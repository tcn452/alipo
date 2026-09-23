import { requireWekodeOps } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = await requireWekodeOps(request);
  if ('error' in access) return Response.json({ error: access.error }, { status: access.status });
  const since = new Date(Date.now() - 30 * 86400000);
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: usage, error: usageError }, { data: reports, error: reportError }] = await Promise.all([
    access.supabase.from('app_usage_daily').select('visitor_hash,usage_date,channel,visit_count').gte('usage_date', since.toISOString().slice(0, 10)).limit(10000),
    access.supabase.from('report_analytics').select('report_id,reporter_hash,status,fuel_type,source,created_at,stations(name,city)').gte('created_at', since.toISOString()).order('created_at', { ascending: false }).limit(10000),
  ]);
  if (usageError || reportError) return Response.json({ error: 'Unable to load analytics.' }, { status: 502 });
  const daily = Array.from({ length: 14 }, (_, index) => { const date = new Date(Date.now() - (13 - index) * 86400000).toISOString().slice(0, 10); return { date, visitors: new Set((usage || []).filter((row) => row.usage_date === date).map((row) => row.visitor_hash)).size, reports: (reports || []).filter((row) => row.created_at.slice(0, 10) === date).length }; });
  const countBy = (key: 'status' | 'fuel_type' | 'source') => Object.entries((reports || []).reduce<Record<string, number>>((totals, row) => { const value = String(row[key]); totals[value] = (totals[value] || 0) + 1; return totals; }, {})).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  return Response.json({ metrics: { usersToday: new Set((usage || []).filter((row) => row.usage_date === today).map((row) => row.visitor_hash)).size, users30Days: new Set((usage || []).map((row) => row.visitor_hash)).size, pwaUsers30Days: new Set((usage || []).filter((row) => row.channel === 'pwa').map((row) => row.visitor_hash)).size, visits30Days: (usage || []).reduce((sum, row) => sum + row.visit_count, 0), reportsToday: (reports || []).filter((row) => row.created_at.slice(0, 10) === today).length, reports30Days: (reports || []).length, uniqueReporters30Days: new Set((reports || []).map((row) => row.reporter_hash).filter(Boolean)).size }, daily, breakdowns: { status: countBy('status'), fuel: countBy('fuel_type'), source: countBy('source') }, recentReports: (reports || []).slice(0, 20).map(({ reporter_hash: _private, ...row }) => row) });
}
