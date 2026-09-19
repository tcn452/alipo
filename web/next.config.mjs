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
