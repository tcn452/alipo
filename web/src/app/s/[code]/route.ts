import { stationIdFromShareCode, trackedStationUrl } from '@/lib/station-share';

export function GET(request: Request, { params }: { params: { code: string } }) {
  const id = stationIdFromShareCode(params.code);
  if (!id) return new Response('Station link not found.', { status: 404 });
  // The shared text stays short; GA attribution is added at the destination.
  return Response.redirect(trackedStationUrl(new URL(request.url).origin, id), 307);
}
