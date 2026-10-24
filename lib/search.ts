import Fuse from 'fuse.js';
import type { Fejl } from '@/lib/db';

// Fuse.js-opsaetning til fuzzy-soegning. Lav threshold = strammere match;
// 0.45 fanger stavefejl og delord ("lading" -> "Opladning") uden for meget stoej.
const OPTIONS: import('fuse.js').IFuseOptions<Fejl> = {
  keys: [
    { name: 'titel', weight: 0.6 },
    { name: 'beskrivelse', weight: 0.3 },
    { name: 'bilmodel', weight: 0.1 },
  ],
  // 0.6 er bevidst loest, saa stavefejl og delord (fx "lading" -> "Opladning",
  // score ~0.55) stadig fanges. Lavere end dette missede aabenlyse match.
  threshold: 0.6,
  ignoreLocation: true, // match hvor som helst i teksten, ikke kun i starten
  minMatchCharLength: 2,
  includeScore: true,
};

export function soeg<T extends Fejl>(alle: T[], query: string): T[] {
  const q = query.trim();
  if (!q) return alle;
  const fuse = new Fuse(alle, OPTIONS as import('fuse.js').IFuseOptions<T>);
  return fuse.search(q).map((r) => r.item);
}

// Bruges af opret-flowet til at afgoere om der findes et "for taet" match,
// saa oprettelsen midlertidigt blokeres.
export function findLignende(alle: Fejl[], query: string): Fejl[] {
  const q = query.trim();
  if (q.length < 3) return [];
  const fuse = new Fuse(alle, { ...OPTIONS, threshold: 0.6 });
  return fuse
    .search(q)
    // Score < 0.62 = "taet nok" til at vaere en sandsynlig dublet. Fanger stavefejl.
    .filter((r) => (r.score ?? 1) < 0.62)
    .slice(0, 5)
    .map((r) => r.item);
}
