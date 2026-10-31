import type { Metadata } from 'next';
import Link from 'next/link';
import { queries } from '@/lib/db';
import TilmeldForm from '@/components/TilmeldForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Opret adgang',
  robots: { index: false, follow: false },
};

export default function TilmeldSide({
  searchParams,
}: {
  searchParams?: { token?: string };
}) {
  const token = searchParams?.token || '';
  const inv = token ? queries.findAabenInvitation.get(token) : null;

  if (!inv) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <div className="kort p-8 text-center">
          <span className="text-4xl" aria-hidden>🚫</span>
          <h1 className="mt-3 text-xl font-black text-asfalt-900">Ugyldigt link</h1>
          <p className="mt-2 text-sm text-asfalt-600">
            Invitationen er ugyldig eller allerede brugt. Bed formanden om et nyt link.
          </p>
          <Link href="/" className="btn-ghost mt-5">
            ← Til forsiden
          </Link>
        </div>
      </div>
    );
  }

  return <TilmeldForm token={token} navn={inv.navn} rolle={inv.rolle} />;
}
