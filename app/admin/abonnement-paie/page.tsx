import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BoutonAbonnementPaie from "@/components/BoutonAbonnementPaie";
import OngletsAbonnements from "@/components/OngletsAbonnements";
import ExportCSV from "@/components/ExportCSV";

export const dynamic = "force-dynamic";

// Services comparés entre les formules (lignes du tableau)
const SERVICES: { key: string; label: string }[] = [
  { key: "entreesSortiesIncluses", label: "Arrivées & sorties incluses" },
  { key: "espaceSalarieInclus", label: "Espace salarié inclus" },
  { key: "relancesVariables", label: "Relance des variables" },
  { key: "suiviRH", label: "Suivi des échéances" },
  { key: "veillePaie", label: "Veille paie" },
  { key: "suiviIJSS", label: "Suivi IJSS" },
  { key: "conseilPaie", label: "Conseil paie" },
  { key: "pointPaie", label: "Rendez-vous paie" },
  { key: "recouvrementIJSS", label: "Recouvrement IJSS" },
  { key: "assistanceURSSAF", label: "Assistance contrôle URSSAF" },
];

const TEINTE: Record<string, string> = { ESSENTIELLE: "#3b82f6", SERENITE: "#8b5cf6", PREMIUM: "#f59e0b", ENTREPRISE: "#111827" };
const eur = (n: number) => `${Math.round(n * 100) / 100} €`.replace(".", ",");

export default async function AdminAbonnementPaie({ searchParams }: { searchParams: Promise<{ formule?: string; tous?: string }> }) {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");
  const sp = await searchParams;

  const maintenant = new Date();
  const debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const fin = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0, 23, 59, 59);

  const [formules, entreprises, comptes] = await Promise.all([
    prisma.abonnementPaie.findMany({ orderBy: { prixMensuel: "asc" } }),
    prisma.entreprise.findMany({ where: { demo: false }, select: { id: true, nom: true, actif: true, abonnementPaieId: true }, orderBy: { nom: "asc" } }),
    prisma.salarie.groupBy({
      by: ["entrepriseId"],
      where: { statut: "Actif", dateDebut: { lte: fin }, OR: [{ dateFin: null }, { dateFin: { gte: debut } }], entreprise: { demo: false } },
      _count: { _all: true },
    }),
  ]);

  const lignes = entreprises.map((e) => {
    const f = formules.find((x) => x.id === e.abonnementPaieId) ?? null;
    const bulletins = comptes.find((c) => c.entrepriseId === e.id)?._count._all ?? 0;
    const supp = f ? Math.max(bulletins - f.bulletinsInclus, 0) : 0;
    const montant = f ? f.prixMensuel + supp * f.prixBulletinSupp : 0;
    // Formule plus avantageuse si le client dépasse beaucoup son forfait
    const mieux = f ? formules.find((x) => x.prixMensuel > f.prixMensuel && x.prixMensuel + Math.max(bulletins - x.bulletinsInclus, 0) * x.prixBulletinSupp < montant) : undefined;
    return { e, f, bulletins, supp, montant, mieux };
  });
  const filtrees = lignes.filter((l) => (sp.formule ? l.f?.id === sp.formule : sp.tous ? true : !!l.f));
  const parFormule = (id: string) => lignes.filter((l) => l.f?.id === id);
  const caPaie = lignes.reduce((a, l) => a + (l.e.actif !== false ? l.montant : 0), 0);

  const lienFiltre = (q: string) => `/admin/abonnement-paie${q}`;
  const puce = (actif: boolean) => `px-3 py-1 rounded-full text-sm font-semibold ${actif ? "bg-orange-500 text-white" : "bg-white text-gray-600 border"}`;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom={session.prenom} />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-6 md:p-10" style={{ minWidth: 0 }}>
          <OngletsAbonnements espace="admin" actif="paie" />

          <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <div className="bg-white rounded-xl shadow p-4" style={{ borderTop: "4px solid #f97316" }}>
              <p className="text-xs font-bold text-gray-500 uppercase">Clients paie</p>
              <p className="text-2xl font-bold">{lignes.filter((l) => l.f).length}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-xs font-bold text-gray-500 uppercase">Bulletins ce mois</p>
              <p className="text-2xl font-bold">{lignes.filter((l) => l.f).reduce((a, l) => a + l.bulletins, 0)}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-xs font-bold text-gray-500 uppercase">CA paie du mois (hors options)</p>
              <p className="text-2xl font-bold">{eur(caPaie)}</p>
            </div>
          </div>

          {/* Comparatif des formules */}
          <div className="bg-white rounded-xl shadow p-6 mb-6" style={{ overflowX: "auto" }}>
            <h1 className="text-2xl font-bold mb-4">📦 Formules paie</h1>
            <table className="w-full text-sm fr-tableau-fixe" style={{ minWidth: "640px" }}>
              <thead>
                <tr>
                  <th className="text-left py-2"></th>
                  {formules.map((f) => (
                    <th key={f.id} className="py-2 px-2 text-center" style={{ borderTop: `4px solid ${TEINTE[f.code] || "#9ca3af"}` }}>
                      <span className="block text-base font-bold">{f.nom.replace(/^Paie /, "")}</span>
                      <span className="block text-2xl font-black">{f.prixMensuel} €</span>
                      <span className="block text-xs text-gray-500 font-normal">{parFormule(f.id).length} client(s)</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Bulletins inclus", v: (f: (typeof formules)[number]) => String(f.bulletinsInclus) },
                  { label: "Bulletin en plus", v: (f: (typeof formules)[number]) => eur(f.prixBulletinSupp) },
                  { label: "Tickets RH inclus / mois", v: (f: (typeof formules)[number]) => String(f.ticketsRHInclus) },
                  { label: "Ticket RH en plus", v: (f: (typeof formules)[number]) => eur(f.prixTicketSupp) },
                  { label: "Arrivée / sortie", v: (f: (typeof formules)[number]) => (f.entreesSortiesIncluses ? "incluses" : `${eur(f.prixEntree)} / ${eur(f.prixSortie)}`) },
                  { label: "Espace salarié", v: (f: (typeof formules)[number]) => (f.espaceSalarieInclus ? "inclus" : `${eur(f.prixEspaceSalarie)}/salarié`) },
                ].map((r) => (
                  <tr key={r.label} className="border-t">
                    <td className="py-2 font-semibold text-gray-600">{r.label}</td>
                    {formules.map((f) => <td key={f.id} className="py-2 text-center font-semibold">{r.v(f)}</td>)}
                  </tr>
                ))}
                {SERVICES.map((s) => (
                  <tr key={s.key} className="border-t">
                    <td className="py-2 text-gray-600">{s.label}</td>
                    {formules.map((f) => {
                      const ok = (f as unknown as Record<string, unknown>)[s.key] === true;
                      return <td key={f.id} className="py-2 text-center" style={{ color: ok ? "#16a34a" : "#d1d5db", fontWeight: 700 }}>{ok ? "✓" : "—"}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-3">Les prix se mettent à jour avec le script prisma/formules-paie-2026.ts.</p>
          </div>

          {/* Clients */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center gap-3 flex-wrap mb-4">
              <h2 className="text-xl font-bold">🏢 Clients et formule paie</h2>
              <ExportCSV nom="clients-paie" entetes={["Entreprise", "Formule", "Bulletins ce mois", "Inclus", "En plus", "Montant paie estimé"]}
                lignes={filtrees.map((l) => [l.e.nom, l.f?.nom ?? "Aucune", l.bulletins, l.f?.bulletinsInclus ?? "", l.supp, l.montant])} />
            </div>
            <div className="flex gap-2 flex-wrap mb-4">
              <Link href={lienFiltre("")} className={puce(!sp.formule && !sp.tous)}>Avec formule paie</Link>
              {formules.map((f) => <Link key={f.id} href={lienFiltre(`?formule=${f.id}`)} className={puce(sp.formule === f.id)}>{f.nom.replace(/^Paie /, "")} ({parFormule(f.id).length})</Link>)}
              <Link href={lienFiltre("?tous=1")} className={puce(!!sp.tous)}>Tous les clients</Link>
            </div>
            {filtrees.length === 0 ? <p className="text-gray-500">Aucun client avec ce filtre.</p> : (
              <div style={{ overflowX: "auto" }}>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="py-2">Entreprise</th><th className="py-2">Bulletins ce mois</th><th className="py-2">Montant paie estimé</th><th className="py-2">Conseil</th><th className="py-2">Formule</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrees.map((l) => (
                      <tr key={l.e.id} className="border-b align-middle">
                        <td className="py-2 font-semibold">
                          <Link href={`/admin/entreprises/${l.e.id}`} className="hover:underline">{l.e.nom}</Link>
                          {l.e.actif === false && <span className="ml-2 text-xs text-red-600">suspendue</span>}
                        </td>
                        <td className="py-2">
                          {l.f ? (
                            <>
                              <strong>{l.bulletins}</strong> / {l.f.bulletinsInclus}
                              {l.supp > 0 && <span style={{ color: "#c2410c", fontWeight: 700 }}> (+{l.supp})</span>}
                            </>
                          ) : <span className="text-gray-400">{l.bulletins} salarié(s)</span>}
                        </td>
                        <td className="py-2 font-semibold">{l.f ? eur(l.montant) : "—"}</td>
                        <td className="py-2 text-xs">{l.mieux ? <span style={{ color: "#15803d", fontWeight: 600 }}>💡 {l.mieux.nom} reviendrait moins cher</span> : ""}</td>
                        <td className="py-2"><BoutonAbonnementPaie entrepriseId={l.e.id} abonnementPaieId={l.e.abonnementPaieId || ""} formules={formules} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
