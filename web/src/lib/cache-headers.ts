export function publicCdnCacheHeaders(maxAgeSeconds: number, staleWhileRevalidateSeconds: number) {
  const sharedPolicy = `public, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`;

  return {
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'CDN-Cache-Control': sharedPolicy,
    'Vercel-CDN-Cache-Control': sharedPolicy,
  };
}
