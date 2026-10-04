import { ImageResponse } from 'next/og';
import { getSharedStation } from '@/lib/shared-station-server';
import { fuelShareLabel } from '@/lib/station-share';

export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const station = await getSharedStation(params.id);
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#fbf8f1', padding: 50, color: '#06452f', fontFamily: 'sans-serif' }}>
    <div style={{ fontSize: 38, fontWeight: 800 }}>ALIPO · Malawi fuel updates</div>
    <div style={{ fontSize: 54, fontWeight: 800, marginTop: 35 }}>{station?.name || 'Check current fuel reports'}</div>
    <div style={{ fontSize: 26, marginTop: 15 }}>{station ? `${station.district}, ${station.city}` : 'alipo.co.mw'}</div>
    {station ? (['petrol', 'diesel'] as const).map((fuel) => <div key={fuel} style={{ display: 'flex', flexDirection: 'column', marginTop: 30 }}><div style={{ fontSize: 32 }}>{fuel.toUpperCase()}: {fuelShareLabel(station, fuel)}</div><div style={{ fontSize: 22, marginTop: 6 }}>{station[`${fuel}_reported_at`] ? `Reported ${new Date(station[`${fuel}_reported_at`]!).toLocaleString('en-GB', { timeZone: 'Africa/Blantyre' })} CAT` : 'No recent report'}</div></div>) : null}
    <div style={{ fontSize: 22, marginTop: 'auto' }}>Community reports can change. Check before travelling · alipo.co.mw</div>
  </div>, { width: 1200, height: 630, headers: { 'Cache-Control': 'no-store' } });
}
