import { queries } from '@/lib/db';
import { erLoggetInd, sessionInfo } from '@/lib/auth';
import AdminLogin from '@/components/AdminLogin';
import AdminDashboard, {
  type Overblik,
  type AktivitetItem,
  type HenvendelseItem,
  type AdgangItem,
  type InvitationItem,
  type RapportLogItem,
  type SidstSendt,
} from '@/components/AdminDashboard';

export const dynamic = 'force-dynamic';

export default function AdminSide() {
  if (!erLoggetInd()) {
    return <AdminLogin />;
  }
  const session = sessionInfo()!;
  const erAdmin = session.rolle === 'admin';

  const fejl = queries.alleFejl.all();

  // Adgange + invitationer kun relevant (og kun vist) for admin.
  const adgange: AdgangItem[] = erAdmin
    ? queries.alleAdgange.all().map((a) => ({
        id: a.id,
        navn: a.navn,
        rolle: a.rolle,
        aktiv: a.aktiv === 1,
        oprettet: a.oprettet,
        sidstBrugt: a.sidst_brugt,
      }))
    : [];
  const invitationer: InvitationItem[] = erAdmin
    ? queries.alleInvitationer
        .all()
        .filter((i) => i.brugt === 0)
        .map((i) => ({ id: i.id, navn: i.navn, rolle: i.rolle, token: i.token, oprettet: i.oprettet }))
    : [];
  const rapportLog: RapportLogItem[] = erAdmin
    ? queries.senesteRapportLog.all(40).map((r) => ({
        navn: r.navn,
        rolle: r.rolle,
        format: r.format,
        type: r.type,
        antal: r.antal,
        kunAendrede: r.kun_aendrede === 1,
        medKommentarer: r.med_kommentarer === 1,
        oprettet: r.oprettet,
      }))
    : [];

  // Sidste (ikke-fortrudte) "Dan rapport"-markering — til visning + fortryd-knap.
  const sm = queries.sidsteMarkering.get();
  const sidstSendt: SidstSendt | null = sm
    ? { navn: sm.navn, rolle: sm.rolle, antal: sm.antal, oprettet: sm.oprettet }
    : null;

  // --- Overblik: server-side "sidst set" (paalideligt, uafhaengigt af browser) ---
  const sidstSet = queries.hentMeta.get('admin_sidst_set')?.vaerdi ?? null;

  const nyeFejl = queries.antalFejlSiden.get(sidstSet)!.n;
  const nyeKommentarer = queries.antalKommentarerSiden.get(sidstSet)!.n;
  const totalFejl = queries.antalFejl.get()!.n;
  const totalKommentarer = queries.antalKommentarer.get()!.n;

  const senesteFejl = queries.senesteFejl.all(15);
  const senesteKommentarer = queries.senesteKommentarer.all(15);

  const totalHenvendelser = queries.antalHenvendelser.get()!.n;
  const nyeHenvendelser = queries.antalHenvendelserSiden.get(sidstSet)!.n;
  const henvendelser: HenvendelseItem[] = queries.senesteHenvendelser.all(20).map((h) => ({
    id: h.id,
    navn: h.navn,
    email: h.email,
    besked: h.besked,
    oprettet: h.oprettet,
    ny: sidstSet ? h.oprettet > sidstSet : false,
  }));

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
    totalHenvendelser,
    nyeHenvendelser,
    henvendelser,
    sidstSet,
    aktivitet,
  };

  // Markér "nu" som sidst set, saa naeste besoeg viser hvad der er kommet siden.
  queries.saetMetaNu.run('admin_sidst_set');

  return (
    <AdminDashboard
      fejl={fejl}
      overblik={overblik}
      erAdmin={erAdmin}
      session={session}
      adgange={adgange}
      invitationer={invitationer}
      rapportLog={rapportLog}
      sidstSendt={sidstSendt}
    />
  );
}
