import type { Metadata } from 'next';
import KontaktForm from '@/components/KontaktForm';

export const metadata: Metadata = {
  title: 'Kontakt — Bugherrer',
  description: 'Skriv til formanden bag Bugherrer — ris, ros, idéer eller noget der driller på siden.',
};

export default function KontaktSide() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-black text-asfalt-900">
        Kontakt formanden <span aria-hidden>📨</span>
      </h1>
      <p className="mt-2 text-asfalt-600">
        Har du ris, ros, en god idé — eller driller noget på siden? Skriv her, så lander
        det direkte hos ham der passer byggepladsen. Vil du have svar, så husk din e-mail.
      </p>
      <p className="mt-1 text-sm text-asfalt-500">
        Fundet en <em>fejl på bilen</em>? Så hører den til som en{' '}
        <a href="/opret" className="font-bold text-hjelm-700 hover:underline">bugherre</a>, ikke her. 🙂
      </p>
      <div className="mt-6">
        <KontaktForm />
      </div>
    </div>
  );
}
