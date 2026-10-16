import type { MetadataRoute } from 'next';
import { absolute } from '@/lib/site';
import { TERMS_VERSION } from '@/lib/terms';
import { PRIVACY_VERSION } from '@/lib/privacy';

// Public pages only. Add new marketing pages here.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absolute('/'), changeFrequency: 'monthly', priority: 1 },
    { url: absolute('/terms'), lastModified: TERMS_VERSION, changeFrequency: 'yearly', priority: 0.4 },
    { url: absolute('/privacy'), lastModified: PRIVACY_VERSION, changeFrequency: 'yearly', priority: 0.4 },
  ];
}
