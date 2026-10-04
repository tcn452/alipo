import 'server-only';

// Origin handlers cannot see CDN hits: use hosting access logs for HIT/MISS rates.
export function logServerResponse(route: string, response: Response) {
  console.info(JSON.stringify({ event: 'edge_cache_response', route, cache_status: 'origin', response_status: response.status }));
  return response;
}
