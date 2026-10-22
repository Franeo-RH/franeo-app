import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BoutonExport from "@/components/BoutonExport";

export const dynamic = "force-dynamic";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default async function MouvementsPersonnel() {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const maintenant = new Date();
  const anneeActuelle = maintenant.getFullYear();
  const moisActuel = maintenant.getMonth() + 1;

  const salaries = await prisma.salarie.findMany({
    where: {
      entreprise: { demo: false },
      OR: [
        { dateDebut: { gte: new Date(anneeActuelle, 0, 1), lte: new Date(anneeActuelle, 11, 31) } },
        { dateFin: { gte: new Date(anneeActuelle, 0, 1), lte: new Date(anneeActuelle, 11, 31) } },
      ],
    },
    include: { entreprise: true },
    orderBy: { dateDebut: "asc" },
  });

  const entreesParMois = MOIS.map((nomMois, i) => {
    const moisNum = i + 1;
    const entrees = salaries.filter(s => {
      if (!s.dateDebut) return false;
      const d = new Date(s.dateDebut);
      return d.getMonth() + 1 === moisNum && d.getFullYear() === anneeActuelle;
    });
    return { moisNum, nomMois, entrees };
  });

  const sortiesParMois = MOIS.map((nomMois, i) => {
    const moisNum = i + 1;
    const sorties = salaries.filter(s => {
      if (!s.dateFin) return false;
      const d = new Date(s.dateFin);
      return d.getMonth() + 1 === moisNum && d.getFullYear() === anneeActuelle;
    });
    return { moisNum, nomMois, sorties };
  });

  const totalEntrees = salaries.filter(s => s.dateDebut && new Date(s.dateDebut).getFullYear() === anneeActuelle).length;
  const totalSorties = salaries.filter(s => s.dateFin && new Date(s.dateFin).getFullYear() === anneeActuelle).length;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">🔄 Mouvements du personnel</h1>
              <p className="text-gray-500 mt-1">Entrées et sorties prévues — {anneeActuelle}</p>
            </div>
            <BoutonExport type="mouvements" label="📥 Exporter Excel" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-400 text-xs font-semibold uppercase mb-2">Total entrées {anneeActuelle}</p>
              <p className="text-3xl font-bold text-green-500">{totalEntrees}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-400 text-xs font-semibold uppercase mb-2">Total sorties {anneeActuelle}</p>
              <p className="text-3xl font-bold text-red-500">{totalSorties}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-400 text-xs font-semibold uppercase mb-2">Solde net</p>
              <p className={`text-3xl font-bold ${totalEntrees - totalSorties >= 0 ? "text-green-500" : "text-red-500"}`}>
                {totalEntrees - totalSorties > 0 ? "+" : ""}{totalEntrees - totalSorties}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">

            {/* Tableau entrées */}
            <div className="bg-white rounded-xl shadow p-8">
              <h2 className="text-xl font-bold mb-6 text-green-600">📥 Entrées {anneeActuelle}</h2>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Mois</th>
                    <th className="pb-3">Salarié(s)</th>
                  </tr>
                </thead>
                <tbody>
                  {entreesParMois.map(({ moisNum, nomMois, entrees }) => {
                    const estActuel = moisNum === moisActuel;
                    return (
                      <tr key={moisNum} className={`border-b ${estActuel ? "bg-orange-50" : "hover:bg-gray-50"} transition align-top`}>
                        <td className="py-3 font-semibold text-sm whitespace-nowrap">
                          {nomMois}
                          {estActuel && <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">Actuel</span>}
                        </td>
                        <td className="py-3">
                          {entrees.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {entrees.map(s => (
                                <div key={s.id} className="flex items-start gap-2">
                                  <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></span>
                                  <div>
                                    <p className="font-semibold text-sm">{s.prenom} {s.nom}</p>
                                    <p className="text-xs text-gray-400">{s.poste} — {s.entreprise.nom}</p>
                                    <p className="text-xs text-green-600">le {new Date(s.dateDebut!).toLocaleDateString("fr-FR")}</p>
                                    {s.typeContrat && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s.typeContrat}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : <span className="text-gray-300 text-sm">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tableau sorties */}
            <div className="bg-white rounded-xl shadow p-8">
              <h2 className="text-xl font-bold mb-6 text-red-600">📤 Sorties {anneeActuelle}</h2>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Mois</th>
                    <th className="pb-3">Salarié(s)</th>
                  </tr>
                </thead>
                <tbody>
                  {sortiesParMois.map(({ moisNum, nomMois, sorties }) => {
                    const estActuel = moisNum === moisActuel;
                    return (
                      <tr key={moisNum} className={`border-b ${estActuel ? "bg-orange-50" : "hover:bg-gray-50"} transition align-top`}>
                        <td className="py-3 font-semibold text-sm whitespace-nowrap">
                          {nomMois}
                          {estActuel && <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">Actuel</span>}
                        </td>
                        <td className="py-3">
                          {sorties.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {sorties.map(s => (
                                <div key={s.id} className="flex items-start gap-2">
                                  <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></span>
                                  <div>
                                    <p className="font-semibold text-sm">{s.prenom} {s.nom}</p>
                                    <p className="text-xs text-gray-400">{s.poste} — {s.entreprise.nom}</p>
                                    <p className="text-xs text-red-600">le {new Date(s.dateFin!).toLocaleDateString("fr-FR")}</p>
                                    {s.typeContrat && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s.typeContrat}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : <span className="text-gray-300 text-sm">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}