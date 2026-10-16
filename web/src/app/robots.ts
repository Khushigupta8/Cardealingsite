import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// The signed-in areas and the API stay out of search; they also send noindex.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin', '/portal', '/activate', '/reset-password'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
