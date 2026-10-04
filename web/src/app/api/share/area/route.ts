import { shareArea, validAreaFuel } from '@/lib/area-share';
import { getAreaReport } from '@/lib/area-report-server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const area = params.get('area') || '', fuel = params.get('fuel') || '';
  if (!shareArea(area) || !validAreaFuel(fuel)) return Response.json({ error: 'Choose a valid area and fuel.' }, { status: 400 });
  try { return Response.json(await getAreaReport(area, fuel), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ error: 'Unable to load the area report. Please try again.' }, { status: 503 }); }
}
