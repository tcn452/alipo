import type { Metadata } from 'next';
import Link from 'next/link';
import { getSharedStation } from '@/lib/shared-station-server';
import { fuelShareLabel, shareReportTime } from '@/lib/station-share';

export const dynamic = 'force-dynamic';
const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://alipo.co.mw';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const station = await getSharedStation(params.id);
  const title = station ? `${station.name} — Alipo fuel status` : 'Check fuel status on Alipo';
  const description = station ? `Petrol: ${fuelShareLabel(station, 'petrol')}. Diesel: ${fuelShareLabel(station, 'diesel')}. Community reports can change.` : 'Check the latest community fuel reports before travelling.';
  return { title, description, openGraph: { title, description, url: `${origin}/stations/${encodeURIComponent(params.id)}`, images: [{ url: `${origin}/stations/${encodeURIComponent(params.id)}/image`, width: 1200, height: 630 }] } };
}

export default async function SharedStation({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | string[] | undefined> }) {
  const station = await getSharedStation(params.id);
  const query = new URLSearchParams({ station: params.id });
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) { const value = searchParams[key]; if (typeof value === 'string') query.set(key, value.slice(0, 100)); }
  return <main className="mx-auto max-w-xl px-5 py-12">
    <p className="text-sm font-black text-forest">ALIPO · MALAWI</p>
    <h1 className="mt-4 text-3xl font-black">{station?.name || 'Check the latest fuel status'}</h1>
    {station ? <>
      <p className="mt-2 text-muted">{station.district}, {station.city}</p>
      {(['petrol', 'diesel'] as const).map((fuel) => <div key={fuel} className="mt-5 border border-line bg-white p-4"><h2 className="font-black capitalize">{fuel}: {fuelShareLabel(station, fuel)}</h2><p className="mt-1 text-xs text-muted">{shareReportTime(station[`${fuel}_reported_at`])}</p></div>)}
    </> : <p className="mt-3">Open the map to find this station and check current reports.</p>}
    <p className="mt-6 text-sm text-muted">Community reports can change. Check the latest status before travelling.</p>
    <Link href={`/?${query}`} className="mt-5 inline-flex min-h-12 items-center bg-forest px-6 font-bold text-white">Open station on Alipo</Link>
  </main>;
}
