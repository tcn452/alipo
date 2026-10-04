import { shareArea, validAreaFuel, trackedAreaUrl } from '@/lib/area-share';
export function GET(request: Request, { params }: { params: { area: string; fuel: string } }) {
  if (!shareArea(params.area) || !validAreaFuel(params.fuel)) return new Response('Area report not found.', { status: 404 });
  return Response.redirect(trackedAreaUrl(new URL(request.url).origin, params.area, params.fuel), 307);
}
