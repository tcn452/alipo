/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    unoptimized: true
  },
  async headers() {
    return [
      {
        source: '/:asset(favicon|icon-192|icon-512|apple-touch-icon|alipo-lockup|alipo-mark).png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
      {
        source: '/:path*',
        headers: [
          // Explicitly allow same-origin geolocation; some Android browsers (incl. Samsung Internet)
          // are stricter when this policy is absent or inherited from a restrictive default.
          { key: 'Permissions-Policy', value: 'geolocation=(self), microphone=(), camera=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
