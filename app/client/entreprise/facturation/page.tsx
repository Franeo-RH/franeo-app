import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export const dynamic = "force-dynamic";

function lignesCommentaire(commentaire: string | null): string[] {
  if (!commentaire) return [];
  return commentaire
    .replace(/ \| /g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export default async function ClientFacturation() {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");

  const maintenant = new Date();
  const anneeActuelle = maintenant.getFullYear();

  const facturations = await prisma.facturation.findMany({
    where: { entrepriseId: session.entrepriseId! },
    orderBy: [{ annee: "desc" }, { mois: "desc" }],
  });

  const facturationsAnnee = facturations.filter(f => f.annee === anneeActuelle);
  const totalAnnee = facturationsAnnee.reduce((acc, f) => acc + f.montant, 0);
  const totalPaye = facturationsAnnee.filter(f => f.statut === "Payé").reduce((acc, f) => acc + f.montant, 0);
  const totalEnAttente = facturationsAnnee.filter(f => f.statut === "En attente").reduce((acc, f) => acc + f.montant, 0);

  const grille = MOIS.map((nomMois, i) => {
    const moisNum = i + 1;
    const fact = facturationsAnnee.find(f => f.mois === moisNum);
    return { mois: moisNum, nomMois, fact };
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} permissions={session.entreprise?.permissions || []} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h1 className="text-3xl font-bold">🧾 Mes factures</h1>
            <p className="text-gray-500 mt-1">Historique de facturation — {anneeActuelle}</p>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-400 text-xs font-semibold uppercase mb-2">Total facturé {anneeActuelle}</p>
              <p className="text-3xl font-bold">{totalAnnee.toLocaleString("fr-FR")} €</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-400 text-xs font-semibold uppercase mb-2">Total payé</p>
              <p className="text-3xl font-bold text-green-500">{totalPaye.toLocaleString("fr-FR")} €</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-400 text-xs font-semibold uppercase mb-2">En attente</p>
              <p className="text-3xl font-bold text-orange-500">{totalEnAttente.toLocaleString("fr-FR")} €</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h2 className="text-xl font-bold mb-6">📅 Vue annuelle {anneeActuelle}</h2>
            <div className="grid grid-cols-4 gap-4">
              {grille.map(({ mois, nomMois, fact }) => (
                <div key={mois} className={`border rounded-xl p-4 ${
                  fact
                    ? fact.statut === "Payé" ? "border-green-300 bg-green-50"
                    : fact.statut === "En retard" ? "border-red-300 bg-red-50"
                    : "border-orange-300 bg-orange-50"
                    : "border-gray-200 bg-gray-50"
                }`}>
                  <p className="font-semibold text-sm mb-1">{nomMois}</p>
                  {fact ? (
                    <>
                      <p className="text-xl font-bold">{fact.montant.toLocaleString("fr-FR")} €</p>
                      {fact.dateLimitePaie && (
                        <p className="text-xs text-gray-400 mt-1">
                          Échéance : {new Date(fact.dateLimitePaie).toLocaleDateString("fr-FR")}
                        </p>
                      )}
                      <span className={`mt-2 inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        fact.statut === "Payé" ? "bg-green-100 text-green-600" :
                        fact.statut === "En retard" ? "bg-red-100 text-red-600" :
                        "bg-orange-100 text-orange-600"
                      }`}>
                        {fact.statut}
                      </span>
                    </>
                  ) : (
                    <p className="text-gray-400 text-sm mt-2">—</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-8">
            <h2 className="text-xl font-bold mb-6">Historique complet</h2>
            {facturations.length === 0 ? (
              <p className="text-gray-500">Aucune facturation pour le moment.</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Mois</th>
                    <th className="pb-3">Détail</th>
                    <th className="pb-3">Total</th>
                    <th className="pb-3">Échéance</th>
                    <th className="pb-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {facturations.map(f => {
                    const lignes = lignesCommentaire(f.commentaire);
                    return (
                      <tr key={f.id} className="border-b hover:bg-gray-50 transition align-top">
                        <td className="py-4 font-semibold whitespace-nowrap">{MOIS[f.mois - 1]} {f.annee}</td>
                        <td className="py-4 text-sm text-gray-600">
                          {lignes.length > 0 ? (
                            <ul className="flex flex-col gap-1">
                              {lignes.map((ligne, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <span className="text-orange-400">•</span>
                                  <span>{ligne}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-4 font-bold text-lg whitespace-nowrap">{f.montant.toLocaleString("fr-FR")} €</td>
                        <td className="py-4 text-sm text-gray-500 whitespace-nowrap">
                          {f.dateLimitePaie ? new Date(f.dateLimitePaie).toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            f.statut === "Payé" ? "bg-green-100 text-green-600" :
                            f.statut === "En retard" ? "bg-red-100 text-red-600" :
                            "bg-orange-100 text-orange-600"
                          }`}>
                            {f.statut}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}