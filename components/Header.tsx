import Link from 'next/link';
import { SITE } from '@/lib/config';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b-4 border-hjelm-500 bg-asfalt-900 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
          <span className="text-2xl" aria-hidden>🛠️</span>
          <span className="text-lg sm:text-xl">
            {SITE.name}
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1.5 text-sm sm:gap-2">
          <Link href="/" className="rounded px-3 py-1.5 hover:bg-asfalt-700">
            Oversigt
          </Link>
          <Link href="/?type=oenske#listen" className="rounded px-3 py-1.5 hover:bg-asfalt-700">
            💡 Ønsker
          </Link>
          <Link href="/links" className="rounded px-3 py-1.5 hover:bg-asfalt-700">
            Links
          </Link>
          <Link href="/opret" className="btn-primary !py-1.5 !px-3 text-sm">
            + Meld ind
          </Link>
        </nav>
      </div>
    </header>
  );
}
