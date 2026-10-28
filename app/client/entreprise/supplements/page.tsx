import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ExportCSV from "@/components/ExportCSV";
import RafraichirAuto from "@/components/RafraichirAuto";
import MentionsFacturation from "@/components/MentionsFacturation";
import { LIBELLES_CATEGORIE, lignesFacture } from "@/lib/facturation";
import { moisDepuisParam, NOMS_MOIS_FR } from "@/lib/mois";

export const dynamic = "force-dynamic";

const eur = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;

export default async function MesSupplements({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");

  const { mois, annee, valeur } = moisDepuisParam((await searchParams).mois);
  const lignes = (await lignesFacture(session.entrepriseId!, mois, annee)) ?? [];
  const abonnements = lignes.filter((l) => l.categorie === "ABONNEMENT");
  const supplements = lignes.filter((l) => l.categorie !== "ABONNEMENT");
  const totalSupp = supplements.reduce((a, l) => a + l.total, 0);
  const totalAbo = abonnements.reduce((a, l) => a + l.total, 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="CLIENT" prenom={session.prenom} permissions={session.entreprise?.permissions || []} />
      <RafraichirAuto secondes={60} />
      <div className="flex">
        <Sidebar role="CLIENT" />
        <main className="flex-1 p-10" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">➕ Mes suppléments</h1>
              <p className="text-gray-500 mt-1">Ce qui s&apos;ajoute à vos abonnements en {NOMS_MOIS_FR[mois - 1]} {annee}, mis à jour en temps réel.</p>
            </div>
            <form method="get" className="flex gap-2">
              <input type="month" name="mois" defaultValue={valeur} className="border rounded-lg px-3 py-2" aria-label="Mois" />
              <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold">Voir</button>
            </form>
          </div>

          <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <div className="bg-white rounded-xl shadow p-5"><p className="text-xs font-bold text-gray-500 uppercase">Abonnements</p><p className="text-2xl font-bold">{eur(totalAbo)}</p></div>
            <div className="bg-white rounded-xl shadow p-5" style={{ borderTop: "4px solid #f97316" }}><p className="text-xs font-bold text-gray-500 uppercase">Suppléments</p><p className="text-2xl font-bold">{eur(totalSupp)}</p></div>
            <div className="bg-white rounded-xl shadow p-5"><p className="text-xs font-bold text-gray-500 uppercase">Total estimé du mois</p><p className="text-2xl font-bold">{eur(totalAbo + totalSupp)}</p></div>
          </div>

          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="flex justify-between items-center gap-3 flex-wrap mb-4">
              <h2 className="text-xl font-bold">Détail des suppléments</h2>
              <ExportCSV nom={`mes-supplements-${valeur}`} entetes={["Type", "Détail", "Quantité", "Prix unitaire", "Total"]} lignes={supplements.map((l) => [LIBELLES_CATEGORIE[l.categorie], l.libelle, l.quantite, l.prixUnitaire, l.total])} />
            </div>
            {supplements.length === 0 ? <p className="text-gray-500">Aucun supplément ce mois-ci : seuls vos abonnements sont facturés. 👍</p> : (
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b text-gray-500"><th className="py-2">Type</th><th className="py-2">Détail</th><th className="py-2">Qté</th><th className="py-2">Prix unit.</th><th className="py-2">Total</th></tr></thead>
                <tbody>
                  {supplements.map((l, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2 font-semibold">{LIBELLES_CATEGORIE[l.categorie]}</td>
                      <td className="py-2">{l.libelle}</td>
                      <td className="py-2">{l.quantite}</td>
                      <td className="py-2">{eur(l.prixUnitaire)}</td>
                      <td className="py-2 font-bold">{eur(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <MentionsFacturation />
        </main>
      </div>
    </div>
  );
}
