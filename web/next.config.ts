import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Pin the project root: there is an unrelated package-lock.json higher up on this machine.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
  poweredByHeader: false,
  // One 404 page (app/global-not-found.tsx) for both root layouts.
  experimental: { globalNotFound: true },
  // Old or guessable URLs, sent permanently (301) to where the content lives now.
  async redirects() {
    return [
      { source: '/privacy-policy', destination: '/privacy', statusCode: 301 },
      { source: '/membership-terms', destination: '/terms', statusCode: 301 },
      { source: '/refund-policy', destination: '/terms#refunds', statusCode: 301 },
      { source: '/refunds', destination: '/terms#refunds', statusCode: 301 },
      { source: '/contact', destination: '/#enquire', statusCode: 301 },
      { source: '/login', destination: '/portal', statusCode: 301 },
    ];
  },
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
