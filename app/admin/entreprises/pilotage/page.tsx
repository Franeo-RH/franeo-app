import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import CadreAdmin from "@/components/CadreAdmin";
import GraphiqueFactures from "@/components/GraphiqueFactures";
import { calculerFacture } from "@/lib/facturation";
import { MOIS_FR } from "@/lib/bulletins";

export const dynamic = "force-dynamic";
const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/** Admin › Pilotage : revenu récurrent, clients gagnés et perdus, panier moyen, impayés, meilleurs clients */
export default async function PagePilotage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const maintenant = new Date();
  const mois = maintenant.getMonth() + 1, annee = maintenant.getFullYear();
  const il12 = new Date(annee, mois - 12, 1);
  const [entreprises, factures, cabinets] = await Promise.all([
    prisma.entreprise.findMany({ where: { demo: false }, select: { id: true, nom: true, actif: true, createdAt: true, dateSuspension: true, cabinetId: true, abonnement: { select: { nom: true } }, abonnementPaie: { select: { nom: true } } } }),
    prisma.facturation.findMany({ where: { entreprise: { demo: false }, OR: [{ annee }, { annee: annee - 1, mois: { gt: mois } }] }, select: { entrepriseId: true, mois: true, annee: true, montant: true, statut: true } }),
    prisma.cabinet.findMany({ where: { demo: false, actif: true }, select: { tarifForfait: true, tarifParClient: true, _count: { select: { entreprises: { where: { actif: true } } } } } }),
  ]);
  const actifs = entreprises.filter((e) => e.actif);
  // Revenu récurrent du mois : facture générée, sinon estimation ; plus les tarifs des cabinets
  const caClients = await Promise.all(actifs.map(async (e) => {
    const f = factures.filter((x) => x.entrepriseId === e.id && x.mois === mois && x.annee === annee);
    return { e, montant: f.length ? f.reduce((t, x) => t + x.montant, 0) : (await calculerFacture(e.id, mois, annee))?.montant ?? 0 };
  }));
  const caCabinets = cabinets.reduce((t, c) => t + (c.tarifForfait ?? 0) + (c.tarifParClient ?? 0) * c._count.entreprises, 0);
  const mrr = caClients.reduce((t, x) => t + x.montant, 0) + caCabinets;
  const payants = caClients.filter((x) => x.montant > 0);
  const panier = payants.length ? payants.reduce((t, x) => t + x.montant, 0) / payants.length : 0;
  const total12 = factures.reduce((t, f) => t + f.montant, 0);
  const impayes = factures.filter((f) => f.statut !== "Payé").reduce((t, f) => t + f.montant, 0);

  const moisListe = Array.from({ length: 12 }, (_, i) => { const d = new Date(annee, mois - 12 + i, 1); return { m: d.getMonth() + 1, a: d.getFullYear() }; });
  const dansMois = (d: Date | null, m: number, a: number) => !!d && d.getMonth() + 1 === m && d.getFullYear() === a;
  const mouvements = moisListe.map(({ m, a }) => ({ label: `${MOIS_FR[m - 1].slice(0, 4)}.`, gagnes: entreprises.filter((e) => dansMois(e.createdAt, m, a)).length, perdus: entreprises.filter((e) => !e.actif && dansMois(e.dateSuspension, m, a)).length }));
  const maxMvt = Math.max(1, ...mouvements.map((x) => Math.max(x.gagnes, x.perdus)));
  const graphique = moisListe.map(({ m, a }) => { const f = factures.filter((x) => x.mois === m && x.annee === a); return { label: `${MOIS_FR[m - 1].slice(0, 3)}.`, montant: f.reduce((t, x) => t + x.montant, 0), nb: f.length, enCours: m === mois && a === annee }; });
  const top = [...new Map(factures.map((f) => [f.entrepriseId, 0])).keys()]
    .map((id) => ({ e: entreprises.find((x) => x.id === id), ca: factures.filter((f) => f.entrepriseId === id).reduce((t, f) => t + f.montant, 0) }))
    .filter((x) => x.e).sort((a, b) => b.ca - a.ca).slice(0, 8);
  const repartition = [
    { l: "Paie", n: actifs.filter((e) => e.abonnementPaie).length },
    { l: "Pack RH seul", n: actifs.filter((e) => e.abonnement && !e.abonnementPaie).length },
    { l: "Via cabinet", n: actifs.filter((e) => e.cabinetId).length },
    { l: "Sans formule", n: actifs.filter((e) => !e.abonnement && !e.abonnementPaie && !e.cabinetId).length },
  ];
  const nouveaux30 = entreprises.filter((e) => e.createdAt.getTime() > Date.now() - 30 * 86400000).length;

  return (
    <CadreAdmin>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">📈 Pilotage</h1>
        <p className="text-gray-500 mt-1">Les chiffres de FRANEO RH : revenu récurrent, croissance, panier moyen, impayés. Démo exclue.</p>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {[
          { l: `Revenu récurrent (${MOIS_FR[mois - 1]})`, v: eur(mrr), s: caCabinets ? `dont cabinets ${eur(caCabinets)}` : "" },
          { l: "Projection sur 12 mois", v: eur(mrr * 12) },
          { l: "Clients actifs", v: String(actifs.length), s: `${nouveaux30} nouveau(x) en 30 jours` },
          { l: "Panier moyen / client", v: eur(panier) },
          { l: "Facturé sur 12 mois", v: eur(total12) },
          { l: "Impayés en cours", v: eur(impayes), a: impayes > 0, s: total12 ? `${Math.round((impayes / total12) * 100)} % du facturé` : "" },
        ].map((k) => (
          <div key={k.l} className="bg-white rounded-xl shadow p-4">
            <p className="text-xs font-semibold text-gray-500">{k.l}</p>
            <p className="text-2xl font-bold" style={{ color: k.a ? "#dc2626" : "#111827" }}>{k.v}</p>
            {k.s && <p className="text-xs text-gray-400">{k.s}</p>}
          </div>
        ))}
      </div>
      <GraphiqueFactures mois={graphique} />
      <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold mb-3">🔁 Clients gagnés et perdus (12 mois)</h2>
          <div className="flex items-end gap-2 h-40">
            {mouvements.map((x) => (
              <div key={x.label} className="flex-1 flex flex-col items-center gap-1" title={`${x.gagnes} gagné(s), ${x.perdus} perdu(s)`}>
                <div className="w-full flex items-end gap-0.5 justify-center" style={{ height: 120 }}>
                  <div style={{ width: "45%", height: `${(x.gagnes / maxMvt) * 100}%`, background: "#16a34a", borderRadius: 3, minHeight: x.gagnes ? 4 : 0 }} />
                  <div style={{ width: "45%", height: `${(x.perdus / maxMvt) * 100}%`, background: "#dc2626", borderRadius: 3, minHeight: x.perdus ? 4 : 0 }} />
                </div>
                <span className="text-[10px] text-gray-500">{x.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2"><span style={{ color: "#16a34a" }}>■</span> gagnés (création) · <span style={{ color: "#dc2626" }}>■</span> perdus (suspendus)</p>
        </section>
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold mb-3">🧩 Répartition des clients actifs</h2>
          {repartition.map((r) => (
            <div key={r.l} className="mb-2">
              <div className="flex justify-between text-sm"><span>{r.l}</span><strong>{r.n}</strong></div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-orange-500 rounded-full" style={{ width: `${actifs.length ? (r.n / actifs.length) * 100 : 0}%` }} /></div>
            </div>
          ))}
        </section>
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold mb-3">🏆 Meilleurs clients (12 mois)</h2>
          {top.length === 0 ? <p className="text-sm text-gray-500">Pas encore de facture.</p> : (
            <ol className="text-sm flex flex-col gap-1">
              {top.map((x, i) => <li key={x.e!.id} className="flex justify-between"><Link href={`/admin/entreprises/${x.e!.id}?onglet=facturation`} className="hover:text-orange-600">{i + 1}. {x.e!.nom}</Link><strong>{eur(x.ca)}</strong></li>)}
            </ol>
          )}
        </section>
      </div>
    </CadreAdmin>
  );
}
