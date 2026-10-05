import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Pin the project root: there is an unrelated package-lock.json higher up on this machine.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
  poweredByHeader: false,
  // Next 16 requires an allow-list of image qualities.
  images: { qualities: [75], formats: ['image/avif', 'image/webp'] },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
