import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { shareArea, validAreaFuel, areaFuelState } from '@/lib/area-share';
import { getAreaReport } from '@/lib/area-report-server';
import { fuelShareLabel, shareReportTime } from '@/lib/station-share';
import { AreaReportViewed } from '@/components/AreaReportViewed';
import { AreaShare } from '@/components/AreaShare';
export const dynamic = 'force-dynamic';
const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://alipo.co.mw';
type Params = { area: string; fuel: string };
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const area = shareArea(params.area);
  if (!area || !validAreaFuel(params.fuel)) return {};
  const title = `${area.name} ${params.fuel} report — Alipo`;
  const description = 'Live community fuel reports for this area. Check report times and stale labels before travelling.';
  return { title, description, openGraph: { title, description, url: `${origin}/a/${params.area}/${params.fuel}`, images: [{ url: `${origin}/a/${params.area}/${params.fuel}/image`, width: 1200, height: 630 }] } };
}
export default async function AreaReportPage({ params, searchParams }: { params: Params; searchParams: Record<string, string | string[] | undefined> }) {
  const area = shareArea(params.area);
  if (!area || !validAreaFuel(params.fuel)) notFound();
  let report;
  try { report = await getAreaReport(params.area, params.fuel); }
  catch { return <main className="mx-auto max-w-xl px-5 py-12"><h1 className="text-2xl font-black">Area report temporarily unavailable</h1><p className="mt-3 text-muted">We could not load live reports. Try again shortly or open Alipo.</p><Link href="/" className="mt-5 inline-flex min-h-11 items-center bg-forest px-5 font-bold text-white">Open Alipo</Link></main>; }
  const query = new URLSearchParams({ fuel: params.fuel });
  if ('center' in area) query.set('area', area.name);
  else query.set('area', 'All Cities');
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) { const value = searchParams[key]; if (typeof value === 'string') query.set(key, value.slice(0, 100)); }
  return <main className="mx-auto max-w-2xl px-5 py-10">
    <AreaReportViewed area={area.id} fuel={params.fuel} />
    <Link href="/" className="text-sm font-black text-forest">ALIPO · MALAWI</Link>
    <h1 className="mt-5 text-3xl font-black">{`${area.name} · ${params.fuel === 'diesel' ? 'Diesel' : 'Petrol'}`}</h1>
    <p className="mt-3 text-sm text-muted">Live community reports. Stale readings show the last reported status, not current availability.</p>
    <div className="my-5 grid grid-cols-2 gap-2 text-sm"><p className="border border-forest/20 bg-[#e5eddc] p-3 font-bold text-forest">{report.available} reporting fuel</p><p className="border border-line bg-white p-3">{report.total} stations · {report.stale} stale</p></div>
    <AreaShare city={area.name} fuel={params.fuel} />
    <Link href={`/?${query}`} className="mb-5 inline-flex min-h-11 items-center bg-forest px-5 font-bold text-white">Open live map on Alipo</Link>
    {!('center' in area) && area.id !== 'all' ? <p className="mb-4 text-xs text-muted">This regional report includes stations with a recognised district or city. The main map shows all Malawi.</p> : 'center' in area ? <p className="mb-4 text-xs text-muted">Includes stations listed in this city and within 20 km of its centre.</p> : null}
    {report.stations.length ? <ul className="space-y-3">{report.stations.map((station) => {
      const state = areaFuelState(station, params.fuel as 'petrol' | 'diesel', Date.parse(report.generatedAt));
      return <li key={station.id} className="border border-line bg-white p-4"><Link href={`/stations/${station.id}`} className="font-black text-forest underline underline-offset-4">{station.name}</Link><p className={`mt-2 text-sm font-bold ${state === 'out' ? 'text-fuel-out' : state === 'stale' ? 'text-[#795548]' : 'text-forest'}`}>{fuelShareLabel(station, params.fuel as 'petrol' | 'diesel', Date.parse(report.generatedAt))}</p><p className="mt-1 text-xs text-muted">{shareReportTime(station[`${params.fuel as 'petrol' | 'diesel'}_reported_at`], Date.parse(report.generatedAt))}</p></li>;
    })}</ul> : <p className="border border-line bg-white p-5 text-muted">No station reports found for this area and fuel. This does not mean there is no fuel.</p>}
    <p className="mt-6 text-xs text-muted">Reports can change. Open the live map for directions and new confirmations.</p>
  </main>;
}
