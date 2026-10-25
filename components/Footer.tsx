import Link from 'next/link';
import { DISCLAIMER, SITE } from '@/lib/config';

export default function Footer() {
  return (
    <footer className="mt-16 border-t-4 border-dashed border-hjelm-500 bg-asfalt-900 text-asfalt-200">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-4 h-3 w-full bg-advarselsstriber rounded" aria-hidden />
        <p className="text-sm leading-relaxed">
          <span className="mr-1" aria-hidden>⚠️</span>
          <strong className="text-hjelm-400">Juridisk disclaimer:</strong>{' '}
          {DISCLAIMER}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-asfalt-400">
            © {new Date().getFullYear()} {SITE.name} · Bygget af fællesskabet, for fællesskabet 🛠️
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-asfalt-400">
            <Link href="/faq" className="hover:text-hjelm-400">
              FAQ &amp; spilleregler
            </Link>
            <Link href="/links" className="hover:text-hjelm-400">
              Nyttige links
            </Link>
            <Link href="/kontakt" className="hover:text-hjelm-400">
              Kontakt
            </Link>
            <Link href="/admin" className="inline-flex items-center gap-1 hover:text-hjelm-400">
              🔐 Formandens login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
