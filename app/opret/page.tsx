import { Suspense } from 'react';
import OpretFlow from '@/components/OpretFlow';

export const dynamic = 'force-dynamic';

export default function OpretSide() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-black text-asfalt-900">
        Meld en bugherre <span aria-hidden>🚧</span>
      </h1>
      <p className="mt-2 text-asfalt-600">
        Inden vi graver en ny byggegrund ud, tjekker vi lige to ting — så admin
        slipper for dobbeltarbejde.
      </p>
      <div className="mt-6">
        <Suspense fallback={<p className="text-asfalt-500">Henter…</p>}>
          <OpretFlow />
        </Suspense>
      </div>
    </div>
  );
}
