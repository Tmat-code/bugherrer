import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/config';

// robots.txt genereret dynamisk, så Sitemap-URL'en følger domænet (SITE_DOMAIN).
// Admin-området holdes ude af indekset.
export default function robots(): MetadataRoute.Robots {
  const base = `https://${SITE.domain}`;
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/admin' },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
