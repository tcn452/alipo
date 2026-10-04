import { ImageResponse } from 'next/og';
import { shareArea, validAreaFuel } from '@/lib/area-share';
import { getAreaReport } from '@/lib/area-report-server';
import { fuelShareLabel, shareReportTime } from '@/lib/station-share';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: { area: string; fuel: string } }) {
  if (!shareArea(params.area) || !validAreaFuel(params.fuel)) return new Response('Area report not found.', { status: 404 });
  let report;
  try { report = await getAreaReport(params.area, params.fuel); }
  catch { return new Response('Area report unavailable.', { status: 503 }); }
  const now = Date.parse(report.generatedAt);
  return new ImageResponse(<div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#fbf8f1', padding: 40, color: '#06452f', fontFamily: 'sans-serif' }}>
    <div style={{ fontSize: 24, fontWeight: 700 }}>ALIPO · Area fuel report</div>
    <div style={{ fontSize: 42, fontWeight: 800, marginTop: 10 }}>{`${report.areaName} · ${params.fuel === 'diesel' ? 'Diesel' : 'Petrol'}`}</div>
    <div style={{ fontSize: 23, marginTop: 10 }}>{`${report.available} reporting fuel · ${report.out} out · ${report.stale} stale · ${report.total} stations`}</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 25 }}>
      {report.stations.slice(0, 6).map((station) => <div key={station.id} style={{ display: 'flex', flexDirection: 'column', width: 545, background: '#fff', padding: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{station.name.length > 40 ? `${station.name.slice(0, 39)}…` : station.name}</div>
        <div style={{ fontSize: 18, marginTop: 8 }}>{fuelShareLabel(station, report.fuel, now)}</div>
        <div style={{ fontSize: 14, marginTop: 6, color: '#66736d' }}>{shareReportTime(station[`${report.fuel}_reported_at`], now)}</div>
      </div>)}
      {!report.total ? <div style={{ fontSize: 24 }}>No station reports found. Check Alipo for updates.</div> : null}
    </div>
    <div style={{ fontSize: 18, marginTop: 'auto' }}>Stale reports are not current availability. Check before travelling.</div>
    <div style={{ fontSize: 20, marginTop: 8 }}>{`Full live report: alipo.co.mw/r/${report.areaId}/${report.fuel}`}</div>
  </div>, { width: 1200, height: 630, headers: { 'Cache-Control': 'no-store' } });
}
