import type { MetadataRoute } from 'next';
import { queries } from '@/lib/db';
import { SITE } from '@/lib/config';

// Dynamisk sitemap: statiske sider + alle fejl-sider. Hjælper Google med at
// finde og indeksere hver enkelt bugherre. Genereres frisk (ingen caching).
export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = `https://${SITE.domain}`;

  const naa = new Date();
  const statiske: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: naa, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/opret`, lastModified: naa, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/links`, lastModified: naa, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/faq`, lastModified: naa, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/kontakt`, lastModified: naa, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const fejl: MetadataRoute.Sitemap = queries.alleFejl.all().map((f) => ({
    url: `${base}/fejl/${f.id}`,
    lastModified: new Date((f.opdateret || f.oprettet).replace(' ', 'T') + 'Z'),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...statiske, ...fejl];
}
