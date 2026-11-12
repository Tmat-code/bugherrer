import Link from 'next/link';
import { queries } from '@/lib/db';
import AfmeldKnap from '@/components/AfmeldKnap';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Afmeld notifikationer', robots: { index: false } };

export default function AfmeldSide({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token || '';
  const tilmelding = token ? queries.findTilmeldingVedToken.get(token) : null;
  const fejl = tilmelding ? queries.fejlById.get(tilmelding.fejl_id) : null;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-black text-asfalt-900">Afmeld notifikationer</h1>

      {!tilmelding ? (
        <div className="kort mt-6 p-6 text-center">
          <p className="text-asfalt-700">
            Linket er ugyldigt eller allerede brugt — du er sandsynligvis ikke tilmeldt
            længere. Der er ikke noget, du behøver gøre.
          </p>
          <Link href="/" className="btn-primary mt-4 inline-block">
            Til forsiden
          </Link>
        </div>
      ) : (
        <>
          {fejl && (
            <p className="mt-2 text-sm text-asfalt-500">
              Gælder tråden: <span className="font-bold text-asfalt-700">{fejl.titel}</span>
            </p>
          )}
          <div className="mt-6">
            <AfmeldKnap token={token} />
          </div>
        </>
      )}
    </div>
  );
}
