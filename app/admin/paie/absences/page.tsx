import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BoutonDecisionAbsence from "@/components/BoutonDecisionAbsence";
import BoutonExportAbsences from "@/components/BoutonExportAbsences";
import FormulaireAbsenceAdmin from "@/components/FormulaireAbsenceAdmin";

const TYPES_ABSENCE: Record<string, string> = {
  CONGE_PAYE: "🏖️ Congés payés",
  RTT: "📅 RTT",
  CONGE_SANS_SOLDE: "💼 Congé sans solde",
  CONGE_EXCEPTIONNEL: "⭐ Congé exceptionnel",
  CONGE_NAISSANCE: "👶 Congé naissance",
  MATERNITE_PATERNITE: "👨‍👩‍👦 Maternité / Paternité",
  MALADIE: "🤒 Maladie",
  ABSENCE_NON_REMUNEREE: "❌ Absence non rémunérée",
};

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const anneeActuelleGlobal = new Date().getFullYear();
const ANNEES = Array.from({ length: 25 }, (_, i) => anneeActuelleGlobal - 10 + i);

export default async function AdminAbsences({
  searchParams,
}: {
  searchParams: Promise<{
    entrepriseId?: string;
    type?: string;
    statut?: string;
    moisDebut?: string; anneeDebut?: string;
    moisFin?: string; anneeFin?: string;
  }>;
}) {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const sp = await searchParams;
  const maintenant = new Date();
  const moisCourant = maintenant.getMonth() + 1;
  const anneeCourante = maintenant.getFullYear();

  const entrepriseId = sp.entrepriseId || "";
  const typeFiltre = sp.type || "tout";
  const statutFiltre = sp.statut || "tout";
  const moisDebut = parseInt(sp.moisDebut || String(moisCourant));
  const anneeDebut = parseInt(sp.anneeDebut || String(anneeCourante));
  const moisFin = parseInt(sp.moisFin || String(moisCourant));
  const anneeFin = parseInt(sp.anneeFin || String(anneeCourante));

  const entreprises = await prisma.entreprise.findMany({
    orderBy: { nom: "asc" },
  });

  const absences = await prisma.absence.findMany({
    where: {
      entreprise: { demo: false },
      ...(entrepriseId ? { entrepriseId } : {}),
      ...(typeFiltre !== "tout" ? { type: typeFiltre as any } : {}),
      ...(statutFiltre !== "tout" ? { statut: statutFiltre } : {}),
      dateDebut: { gte: new Date(anneeDebut, moisDebut - 1, 1) },
      dateFin: { lte: new Date(anneeFin, moisFin, 0) },
    },
    include: {
      salarie: true,
      entreprise: true,
    },
    orderBy: { dateDebut: "desc" },
  });

  const enAttente = absences.filter(a => a.statut === "En attente").length;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">🏖️ Absences</h1>
              <div className="flex gap-4 mt-3">
                <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-semibold">
                  {enAttente} en attente
                </span>
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-semibold">
                  {absences.length} au total
                </span>
              </div>
            </div>
            <BoutonExportAbsences
              entrepriseId={entrepriseId}
              type={typeFiltre}
              statut={statutFiltre}
              moisDebut={moisDebut}
              anneeDebut={anneeDebut}
              moisFin={moisFin}
              anneeFin={anneeFin}
            />
          </div>

          {/* Formulaire ajout */}
          <FormulaireAbsenceAdmin />

          {/* Filtres */}
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <form className="grid grid-cols-3 gap-4 items-end" method="GET">

              <div>
                <label className="block text-sm font-semibold mb-1">Entreprise</label>
                <select name="entrepriseId" defaultValue={entrepriseId} className="w-full border rounded-lg px-4 py-3">
                  <option value="">Toutes</option>
                  {entreprises.map((e) => (
                    <option key={e.id} value={e.id}>{e.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Type</label>
                <select name="type" defaultValue={typeFiltre} className="w-full border rounded-lg px-4 py-3">
                  <option value="tout">Tous les types</option>
                  <option value="CONGE_PAYE">🏖️ Congés payés</option>
                  <option value="RTT">📅 RTT</option>
                  <option value="CONGE_SANS_SOLDE">💼 Congé sans solde</option>
                  <option value="CONGE_EXCEPTIONNEL">⭐ Congé exceptionnel</option>
                  <option value="CONGE_NAISSANCE">👶 Congé naissance</option>
                  <option value="MATERNITE_PATERNITE">👨‍👩‍👦 Maternité / Paternité</option>
                  <option value="MALADIE">🤒 Maladie</option>
                  <option value="ABSENCE_NON_REMUNEREE">❌ Absence non rémunérée</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Statut</label>
                <select name="statut" defaultValue={statutFiltre} className="w-full border rounded-lg px-4 py-3">
                  <option value="tout">Tous</option>
                  <option value="En attente">En attente</option>
                  <option value="Validé">Validé</option>
                  <option value="Refusé">Refusé</option>
                </select>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-1">Mois début</label>
                  <select name="moisDebut" defaultValue={moisDebut} className="w-full border rounded-lg px-4 py-3">
                    {MOIS.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-1">Année</label>
                  <select name="anneeDebut" defaultValue={anneeDebut} className="w-full border rounded-lg px-4 py-3">
                    {ANNEES.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-1">Mois fin</label>
                  <select name="moisFin" defaultValue={moisFin} className="w-full border rounded-lg px-4 py-3">
                    {MOIS.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-1">Année</label>
                  <select name="anneeFin" defaultValue={anneeFin} className="w-full border rounded-lg px-4 py-3">
                    {ANNEES.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-end">
                <button type="submit" className="w-full bg-black text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-800 transition">
                  🔍 Filtrer
                </button>
              </div>

            </form>
          </div>

          {/* Tableau */}
          <div className="bg-white rounded-xl shadow p-8">
            {absences.length === 0 ? (
              <p className="text-gray-500">Aucune absence pour cette période.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3 pr-4">Entreprise</th>
                      <th className="pb-3 pr-4">Salarié</th>
                      <th className="pb-3 pr-4">Type</th>
                      <th className="pb-3 pr-4">Du</th>
                      <th className="pb-3 pr-4">Au</th>
                      <th className="pb-3 pr-4">Durée</th>
                      <th className="pb-3 pr-4">Commentaire</th>
                      <th className="pb-3 pr-4">Statut</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {absences.map((a) => {
                      const jours = Math.ceil((new Date(a.dateFin).getTime() - new Date(a.dateDebut).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      return (
                        <tr key={a.id} className="border-b hover:bg-gray-50 transition">
                          <td className="py-3 pr-4 text-sm">{a.entreprise.nom}</td>
                          <td className="py-3 pr-4">{a.salarie.prenom} {a.salarie.nom}</td>
                          <td className="py-3 pr-4 text-sm">{TYPES_ABSENCE[a.type] || a.type}</td>
                          <td className="py-3 pr-4 text-sm">{new Date(a.dateDebut).toLocaleDateString("fr-FR")}</td>
                          <td className="py-3 pr-4 text-sm">{new Date(a.dateFin).toLocaleDateString("fr-FR")}</td>
                          <td className="py-3 pr-4 font-semibold text-sm">{jours} jour(s)</td>
                          <td className="py-3 pr-4 text-gray-500 text-sm">{a.commentaire || "—"}</td>
                          <td className="py-3 pr-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              a.statut === "En attente" ? "bg-orange-100 text-orange-600" :
                              a.statut === "Validé" ? "bg-green-100 text-green-600" :
                              "bg-red-100 text-red-600"
                            }`}>
                              {a.statut}
                            </span>
                          </td>
                          <td className="py-3">
                            {a.statut === "En attente" && (
                              <BoutonDecisionAbsence absenceId={a.id} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
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