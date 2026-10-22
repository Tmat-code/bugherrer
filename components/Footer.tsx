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
        <p className="mt-4 text-xs text-asfalt-400">
          © {new Date().getFullYear()} {SITE.name} · Bygget af fællesskabet, for fællesskabet 🛠️
        </p>
      </div>
    </footer>
  );
}
