import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BoutonAbonnementPaie from "@/components/BoutonAbonnementPaie";

export const dynamic = "force-dynamic";

const FEATURES: { key: string; label: string }[] = [
  { key: "relancesVariables", label: "Relances variables paie" },
  { key: "relancesSalaries", label: "Relances directes salariés" },
  { key: "modificationsIncluses", label: "Modifications incluses" },
  { key: "regularisationsInclus", label: "Régularisations incluses" },
  { key: "demandesComplexes", label: "Demandes complexes" },
  { key: "veillePaie", label: "Veille paie & réglementaire" },
  { key: "conseilPaie", label: "Conseil paie ponctuel" },
  { key: "suiviRH", label: "Suivi RH complet" },
  { key: "suiviIJSS", label: "Suivi IJSS" },
  { key: "relancesIJSS", label: "Relances IJSS" },
  { key: "recouvrementIJSS", label: "Recouvrement IJSS" },
  { key: "pointPaie", label: "Point paie périodique" },
  { key: "recommandationsPaie", label: "Recommandations paie" },
  { key: "traitementPrioritaire", label: "Traitement prioritaire" },
  { key: "assistanceURSSAF", label: "Assistance URSSAF" },
];

const COULEURS: Record<string, string> = {
  ESSENTIELLE: "border-blue-300 bg-blue-50",
  SERENITE: "border-purple-300 bg-purple-50",
  PREMIUM: "border-amber-300 bg-amber-50",
};

const BADGES: Record<string, string> = {
  ESSENTIELLE: "bg-blue-100 text-blue-800 border-blue-300",
  SERENITE: "bg-purple-100 text-purple-800 border-purple-300",
  PREMIUM: "bg-amber-100 text-amber-800 border-amber-300",
};

export default async function AdminAbonnementPaie() {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const [formules, entreprises] = await Promise.all([
    prisma.abonnementPaie.findMany({ orderBy: { prixMensuel: "asc" } }),
    prisma.entreprise.findMany({
      where: { demo: false },
      include: { abonnementPaie: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom={session.prenom} />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-8">
            <h1 className="text-3xl font-bold">📦 Abonnements Paie</h1>
            <p className="text-gray-500 mt-1">Gérez les formules paie de vos clients</p>
          </div>

          {/* Les 3 formules */}
          <div className="grid grid-cols-3 gap-6 mb-10">
            {formules.map((f) => (
              <div key={f.id} className={`bg-white rounded-xl shadow border-2 p-6 ${COULEURS[f.code] || "border-gray-200"}`}>
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold">{f.nom}</h2>
                  <p className="text-3xl font-black mt-2">
                    {f.prixMensuel} €
                    <span className="text-base font-normal text-gray-500">/mois</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{f.bulletinsInclus} bulletins inclus</p>
                  <p className="text-xs text-gray-400">{f.prixBulletinSupp} €/bulletin supplémentaire</p>
                </div>
                <hr className="my-4" />
                <ul className="space-y-1 text-sm">
                  {FEATURES.map(({ key, label }) => {
                    const val = (f as Record<string, unknown>)[key];
                    return (
                      <li key={key} className="flex gap-2 items-center">
                        <span className={val ? "text-green-500" : "text-gray-300"}>
                          {val ? "✓" : "—"}
                        </span>
                        <span className={val ? "text-gray-700" : "text-gray-400"}>{label}</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-center text-xs text-gray-400 mt-4">
                  {entreprises.filter(e => e.abonnementPaieId === f.id).length} client(s)
                </p>
              </div>
            ))}
          </div>

          {/* Attribution par entreprise */}
          <div className="bg-white rounded-xl shadow p-8">
            <h2 className="text-xl font-bold mb-6">🏢 Attribution par entreprise</h2>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="pb-3">Entreprise</th>
                  <th className="pb-3">Formule actuelle</th>
                  <th className="pb-3">Bulletins utilisés</th>
                  <th className="pb-3">Changer</th>
                </tr>
              </thead>
              <tbody>
                {entreprises.map((e) => (
                  <tr key={e.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 font-semibold">{e.nom}</td>
                    <td className="py-3">
                      {e.abonnementPaie ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${BADGES[e.abonnementPaie.code] || ""}`}>
                          {e.abonnementPaie.nom}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">Aucune</span>
                      )}
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {e.bulletinsUtilises || 0}
                      {e.abonnementPaie ? ` / ${e.abonnementPaie.bulletinsInclus}` : ""}
                    </td>
                    <td className="py-3">
                      <BoutonAbonnementPaie
                        entrepriseId={e.id}
                        abonnementPaieId={e.abonnementPaieId || ""}
                        formules={formules}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </main>
      </div>
    </div>
  );
}