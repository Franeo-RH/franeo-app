import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BoutonsPrestation from "@/components/BoutonsPrestation";
import ExportCSV from "@/components/ExportCSV";
import RafraichirAuto from "@/components/RafraichirAuto";
import { STATUTS_PRESTATION } from "@/lib/prestations";
import { LIBELLES_CATEGORIE, lignesFacture, type CategorieLigne } from "@/lib/facturation";
import { moisDepuisParam, NOMS_MOIS_FR } from "@/lib/mois";

export const dynamic = "force-dynamic";

const eur = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;

export default async function AdminSupplements({ searchParams }: { searchParams: Promise<{ mois?: string; entreprise?: string; categorie?: string }> }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const sp = await searchParams;
  const { mois, annee, valeur } = moisDepuisParam(sp.mois);
  const filtreEnt = sp.entreprise || "";
  const filtreCat = (sp.categorie || "") as CategorieLigne | "";

  const entreprises = await prisma.entreprise.findMany({ where: { demo: false }, select: { id: true, nom: true, actif: true }, orderBy: { nom: "asc" } });
  const cibles = entreprises.filter((e) => e.actif !== false && (!filtreEnt || e.id === filtreEnt));
  const parEntreprise = await Promise.all(cibles.map(async (e) => ({ e, lignes: (await lignesFacture(e.id, mois, annee)) ?? [] })));

  const supplements = parEntreprise.flatMap(({ e, lignes }) =>
    lignes.filter((l) => l.categorie !== "ABONNEMENT" && (!filtreCat || l.categorie === filtreCat)).map((l) => ({ ...l, entreprise: e.nom }))
  );
  const total = supplements.reduce((a, l) => a + l.total, 0);
  const parCategorie = new Map<CategorieLigne, number>();
  for (const l of supplements) parCategorie.set(l.categorie, (parCategorie.get(l.categorie) || 0) + l.total);

  const aTraiter = await prisma.commandePrestation.findMany({
    where: { entreprise: { demo: false }, statut: "A_FAIRE", ...(filtreEnt ? { entrepriseId: filtreEnt } : {}) },
    include: { entreprise: { select: { nom: true } } },
    orderBy: { createdAt: "asc" },
  });

  const categories = (Object.keys(LIBELLES_CATEGORIE) as CategorieLigne[]).filter((c) => c !== "ABONNEMENT");

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <RafraichirAuto secondes={60} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h1 className="text-3xl font-bold">➕ Prestations supplémentaires</h1>
            <p className="text-gray-500 mt-1">Tous les suppléments de {NOMS_MOIS_FR[mois - 1]} {annee} : salariés et bulletins en plus, arrivées, sorties, tickets, recrutements, espace salarié et prestations commandées. Mis à jour en temps réel, ils sont repris sur la facture du mois.</p>
            <form method="get" className="flex gap-2 flex-wrap mt-4">
              <input type="month" name="mois" defaultValue={valeur} className="border rounded-lg px-3 py-2" aria-label="Mois" />
              <select name="entreprise" defaultValue={filtreEnt} className="border rounded-lg px-3 py-2" aria-label="Entreprise">
                <option value="">Tous les clients</option>
                {entreprises.map((e) => <option key={e.id} value={e.id}>{e.nom}{e.actif === false ? " (suspendue)" : ""}</option>)}
              </select>
              <select name="categorie" defaultValue={filtreCat} className="border rounded-lg px-3 py-2" aria-label="Type">
                <option value="">Tous les types</option>
                {categories.map((c) => <option key={c} value={c}>{LIBELLES_CATEGORIE[c]}</option>)}
              </select>
              <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold">Filtrer</button>
            </form>
          </div>

          <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
            <div className="bg-white rounded-xl shadow p-4" style={{ borderTop: "4px solid #f97316" }}>
              <p className="text-xs font-bold text-gray-500 uppercase">Total suppléments</p>
              <p className="text-2xl font-bold">{eur(total)}</p>
            </div>
            {[...parCategorie.entries()].map(([c, m]) => (
              <div key={c} className="bg-white rounded-xl shadow p-4">
                <p className="text-xs font-bold text-gray-500 uppercase">{LIBELLES_CATEGORIE[c]}</p>
                <p className="text-xl font-bold">{eur(m)}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="flex justify-between items-center gap-3 flex-wrap mb-4">
              <h2 className="text-xl font-bold">Détail ({supplements.length})</h2>
              <ExportCSV
                nom={`supplements-${valeur}`}
                entetes={["Client", "Type", "Détail", "Quantité", "Prix unitaire", "Total"]}
                lignes={supplements.map((l) => [l.entreprise, LIBELLES_CATEGORIE[l.categorie], l.libelle, l.quantite, l.prixUnitaire, l.total])}
              />
            </div>
            {supplements.length === 0 ? (
              <p className="text-gray-500">Aucun supplément sur ce mois avec ces filtres.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="py-2">Client</th><th className="py-2">Type</th><th className="py-2">Détail</th><th className="py-2">Qté</th><th className="py-2">Prix unit.</th><th className="py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplements.map((l, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-2 font-semibold">{l.entreprise}</td>
                        <td className="py-2">{LIBELLES_CATEGORIE[l.categorie]}</td>
                        <td className="py-2">{l.libelle}{l.statut ? ` · ${STATUTS_PRESTATION[l.statut] || l.statut}` : ""}</td>
                        <td className="py-2">{l.quantite}</td>
                        <td className="py-2">{eur(l.prixUnitaire)}</td>
                        <td className="py-2 font-bold">{eur(l.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">⏳ Prestations commandées à traiter ({aTraiter.length})</h2>
            {aTraiter.length === 0 ? <p className="text-gray-500">Rien à traiter. 🎉</p> : (
              <div style={{ overflowX: "auto" }}>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-gray-500"><th className="py-2">Date</th><th className="py-2">Client</th><th className="py-2">Prestation</th><th className="py-2">Salarié</th><th className="py-2">Montant</th><th className="py-2">Précisions</th><th className="py-2"></th></tr>
                  </thead>
                  <tbody>
                    {aTraiter.map((c) => (
                      <tr key={c.id} className="border-b align-top">
                        <td className="py-2 text-gray-500">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</td>
                        <td className="py-2 font-semibold">{c.entreprise.nom}</td>
                        <td className="py-2">{c.libelle}{c.quantite > 1 ? ` × ${c.quantite}` : ""}</td>
                        <td className="py-2">{c.salarie || "—"}</td>
                        <td className="py-2 font-semibold">{c.total > 0 ? eur(c.total) : "Inclus"}</td>
                        <td className="py-2 text-gray-500" style={{ maxWidth: "260px" }}>{c.commentaire || "—"}</td>
                        <td className="py-2"><BoutonsPrestation id={c.id} statut={c.statut} /></td>
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
