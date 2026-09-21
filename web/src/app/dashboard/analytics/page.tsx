'use client';

import { useEffect, useState } from 'react';
import { Activity, BarChart3, FileCheck2, RefreshCw, Smartphone, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AnalyticsData {
  metrics: { usersToday: number; users30Days: number; pwaUsers30Days: number; visits30Days: number; reportsToday: number; reports30Days: number; uniqueReporters30Days: number };
  daily: { date: string; visitors: number; reports: number }[];
  breakdowns: { status: { label: string; count: number }[]; fuel: { label: string; count: number }[]; source: { label: string; count: number }[] };
  recentReports: { report_id: string; status: string; fuel_type: string; source: string; created_at: string; stations?: { name?: string; city?: string } | null }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true); setError('');
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) { setError('Sign in as a WeKode operations user to view analytics.'); setLoading(false); return; }
    const response = await fetch('/api/analytics/summary', { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json() as AnalyticsData & { error?: string };
    if (!response.ok) setError(result.error || 'Unable to load analytics.'); else setData(result);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  const maxDaily = Math.max(1, ...(data?.daily.flatMap((day) => [day.visitors, day.reports]) || [1]));
  const cards = data ? [
    ['Users today', data.metrics.usersToday, Users], ['30-day users', data.metrics.users30Days, Activity], ['PWA users', data.metrics.pwaUsers30Days, Smartphone], ['30-day visits', data.metrics.visits30Days, BarChart3], ['Reports today', data.metrics.reportsToday, FileCheck2], ['30-day reports', data.metrics.reports30Days, FileCheck2], ['30-day reporters', data.metrics.uniqueReporters30Days, Users],
  ] as const : [];
  return <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
    <header className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-black tracking-tight text-gray-900">Community Analytics</h1><p className="mt-1 text-xs text-gray-500">Anonymous usage and fuel-report activity from the last 30 days.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button></header>
    {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</div> : null}
    {loading && !data ? <div className="grid min-h-64 place-items-center text-sm font-bold text-gray-500"><RefreshCw className="mb-3 h-6 w-6 animate-spin" />Loading analytics…</div> : null}
    {data ? <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label, value, Icon]) => <div key={label} className="rounded-xl border border-gray-200 bg-white p-4"><div className="flex items-center justify-between text-xs font-bold text-gray-500"><span>{label}</span><Icon className="h-4 w-4 text-emerald-600" /></div><strong className="mt-2 block text-3xl font-black tabular-nums text-gray-900">{value.toLocaleString()}</strong></div>)}</section>
      <section className="rounded-xl border border-gray-200 bg-white p-5"><div className="mb-5"><h2 className="font-black text-gray-900">Last 14 days</h2><p className="text-xs text-gray-500">Unique users and submitted reports per day</p></div><div className="flex h-56 items-end gap-2 overflow-x-auto border-b border-gray-200 pb-1">{data.daily.map((day) => <div key={day.date} className="flex min-w-10 flex-1 flex-col items-center justify-end gap-1"><div className="flex h-44 items-end gap-1"><div title={`${day.visitors} users`} className="w-3 bg-emerald-600" style={{ height: `${Math.max(3, day.visitors / maxDaily * 100)}%` }} /><div title={`${day.reports} reports`} className="w-3 bg-orange" style={{ height: `${Math.max(3, day.reports / maxDaily * 100)}%` }} /></div><span className="text-[9px] text-gray-400">{day.date.slice(5)}</span></div>)}</div><div className="mt-3 flex gap-4 text-[11px] font-bold text-gray-600"><span><i className="mr-1 inline-block h-2 w-2 bg-emerald-600" />Users</span><span><i className="mr-1 inline-block h-2 w-2 bg-orange" />Reports</span></div></section>
      <section className="grid gap-4 lg:grid-cols-3">{Object.entries(data.breakdowns).map(([name, items]) => <div key={name} className="rounded-xl border border-gray-200 bg-white p-5"><h2 className="mb-3 text-sm font-black capitalize text-gray-900">Reports by {name}</h2><div className="space-y-2">{items.map((item) => <div key={item.label} className="flex items-center justify-between border-b border-gray-100 pb-2 text-xs"><span className="capitalize text-gray-600">{item.label.replace('_', ' ')}</span><strong className="tabular-nums text-gray-900">{item.count}</strong></div>)}</div></div>)}</section>
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white"><div className="border-b border-gray-200 p-5"><h2 className="font-black text-gray-900">Recent community reports</h2><p className="text-xs text-gray-500">No phone numbers or visitor identifiers are displayed.</p></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-gray-50 text-gray-500"><tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Station</th><th className="px-4 py-3">Fuel</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Source</th></tr></thead><tbody className="divide-y divide-gray-100">{data.recentReports.map((report) => <tr key={report.report_id}><td className="px-4 py-3 text-gray-500">{new Date(report.created_at).toLocaleString()}</td><td className="px-4 py-3 font-bold text-gray-900">{report.stations?.name || 'Unknown station'}<span className="block font-normal text-gray-400">{report.stations?.city}</span></td><td className="px-4 py-3 capitalize">{report.fuel_type}</td><td className="px-4 py-3 capitalize">{report.status}</td><td className="px-4 py-3 capitalize">{report.source.replace('_', ' ')}</td></tr>)}</tbody></table></div></section>
    </> : null}
  </div>;
}
