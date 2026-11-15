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
import { detailPaie } from "@/lib/grille";
import EditeurTexteFormule from "@/components/EditeurTexteFormule";
import CarteFormuleAdmin from "@/components/CarteFormuleAdmin";
import { clePaie, CLE_MENTION, texteMention, textePaie, textesModifies } from "@/lib/textes-formules";

export const dynamic = "force-dynamic";

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

  const [formules, entreprises, comptes, modifs] = await Promise.all([
    prisma.abonnementPaie.findMany({ orderBy: { prixMensuel: "asc" } }),
    prisma.entreprise.findMany({ where: { demo: false }, select: { id: true, nom: true, actif: true, abonnementPaieId: true }, orderBy: { nom: "asc" } }),
    prisma.salarie.groupBy({
      by: ["entrepriseId"],
      where: { statut: "Actif", dateDebut: { lte: fin }, OR: [{ dateFin: null }, { dateFin: { gte: debut } }], entreprise: { demo: false } },
      _count: { _all: true },
    }),
    textesModifies(),
  ]);
  const mention = texteMention(modifs);

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

          {/* Formules : prix modifiables (✏️), suppression (🗑️), texte vu par le client */}
          <h1 className="text-2xl font-bold mb-3">📦 Formules paie</h1>
          <div className="grid gap-4 mb-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
            {formules.map((f) => {
              const t = textePaie(modifs, f.code);
              return (
                <CarteFormuleAdmin key={f.id} couleur={TEINTE[f.code] || "#9ca3af"}
                  f={{ type: "paie", id: f.id, nom: `Paie ${f.nom.replace(/^Paie /, "")}`, prixMensuel: f.prixMensuel, inclus: f.bulletinsInclus, prixSupp: f.prixBulletinSupp, tickets: f.ticketsRHInclus, prixTicket: f.prixTicketSupp, clients: parFormule(f.id).length, recommande: !!detailPaie(f.code)?.recommande }}>
                  {detailPaie(f.code) ? <EditeurTexteFormule cle={clePaie(f.code)} message={t.message} lignes={t.lignes} modifie={t.modifie} /> : <p className="text-xs text-gray-500">Formule hors grille : elle n&apos;est pas proposée aux clients.</p>}
                </CarteFormuleAdmin>
              );
            })}
          </div>
          <details className="bg-white rounded-xl shadow p-4 mb-6 text-sm">
            <summary className="font-semibold text-gray-600 cursor-pointer">🩺 Mention affichée sous les formules (RH et paie)</summary>
            <div className="mt-3"><EditeurTexteFormule cle={CLE_MENTION} message={mention.message} lignes={[]} modifie={mention.modifie} avecLignes={false} /></div>
          </details>

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
                      <th className="py-2">Entreprise</th><th className="py-2">Bulletins ce mois</th><th className="py-2">Montant paie estimé</th><th className="py-2">Formule</th>
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
                        <td className="py-2 font-semibold">{l.f ? eur(l.montant) : "—"}{l.mieux && <span className="block text-xs font-normal" style={{ color: "#15803d" }}>💡 {l.mieux.nom} moins cher</span>}</td>
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
