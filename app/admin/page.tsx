import { queries } from '@/lib/db';
import { erLoggetInd } from '@/lib/auth';
import AdminLogin from '@/components/AdminLogin';
import AdminDashboard, { type Overblik, type AktivitetItem } from '@/components/AdminDashboard';

export const dynamic = 'force-dynamic';

export default function AdminSide() {
  if (!erLoggetInd()) {
    return <AdminLogin />;
  }

  const fejl = queries.alleFejl.all();

  // --- Overblik: server-side "sidst set" (paalideligt, uafhaengigt af browser) ---
  const sidstSet = queries.hentMeta.get('admin_sidst_set')?.vaerdi ?? null;

  const nyeFejl = queries.antalFejlSiden.get(sidstSet)!.n;
  const nyeKommentarer = queries.antalKommentarerSiden.get(sidstSet)!.n;
  const totalFejl = queries.antalFejl.get()!.n;
  const totalKommentarer = queries.antalKommentarer.get()!.n;

  const senesteFejl = queries.senesteFejl.all(15);
  const senesteKommentarer = queries.senesteKommentarer.all(15);

  const aktivitet: AktivitetItem[] = [
    ...senesteFejl.map(
      (f): AktivitetItem => ({
        slags: 'fejl',
        id: f.id,
        fejlId: f.id,
        titel: f.titel,
        oprettet: f.oprettet,
        ny: sidstSet ? f.oprettet > sidstSet : false,
      })
    ),
    ...senesteKommentarer.map(
      (k): AktivitetItem => ({
        slags: 'kommentar',
        id: k.id,
        fejlId: k.fejl_id,
        titel: k.fejl_titel,
        navn: k.navn,
        uddrag: k.tekst.length > 90 ? k.tekst.slice(0, 90) + '…' : k.tekst,
        oprettet: k.oprettet,
        ny: sidstSet ? k.oprettet > sidstSet : false,
      })
    ),
  ]
    .sort((a, b) => b.oprettet.localeCompare(a.oprettet))
    .slice(0, 20);

  const overblik: Overblik = {
    totalFejl,
    totalKommentarer,
    nyeFejl,
    nyeKommentarer,
    sidstSet,
    aktivitet,
  };

  // Markér "nu" som sidst set, saa naeste besoeg viser hvad der er kommet siden.
  queries.saetMetaNu.run('admin_sidst_set');

  return <AdminDashboard fejl={fejl} overblik={overblik} />;
}
