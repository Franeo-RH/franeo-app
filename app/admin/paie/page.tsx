import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import BoutonExportPaie from "@/components/BoutonExportPaie";
import BoutonResetPaie from "@/components/BoutonResetPaie";
import BoutonValiderPaie from "@/components/BoutonValiderPaie";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default async function AdminPaie({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string; annee?: string; entrepriseId?: string }>;
}) {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const sp = await searchParams;
  const maintenant = new Date();
  const moisSelectionne = parseInt(sp.mois || String(maintenant.getMonth() + 1));
  const anneeSelectionnee = parseInt(sp.annee || String(maintenant.getFullYear()));
  const entrepriseSelectionnee = sp.entrepriseId || "";



  // Requêtes lancées en même temps
  const [entreprises, variables] = await Promise.all([
    prisma.entreprise.findMany({
      orderBy: { nom: "asc" },
    }),
    prisma.variablePaie.findMany({
      where: {
        mois: moisSelectionne,
        annee: anneeSelectionnee,
        entreprise: { demo: false },
        ...(entrepriseSelectionnee ? { entrepriseId: entrepriseSelectionnee } : {}),
      },
      include: {
        salarie: true,
        entreprise: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h1 className="text-3xl font-bold">💰 Paie — Vue admin</h1>
          </div>

          {/* Filtres */}
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <form className="grid grid-cols-4 gap-4" method="GET">
              <div>
                <label className="block text-sm font-semibold mb-1">Mois</label>
                <select name="mois" defaultValue={moisSelectionne} className="w-full border rounded-lg px-4 py-3">
                  {MOIS.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Année</label>
                <select name="annee" defaultValue={anneeSelectionnee} className="w-full border rounded-lg px-4 py-3">
                  {[2024, 2025, 2026, 2027].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Entreprise</label>
                <select name="entrepriseId" defaultValue={entrepriseSelectionnee} className="w-full border rounded-lg px-4 py-3">
                  <option value="">Toutes les entreprises</option>
                  {entreprises.map((e) => (
                    <option key={e.id} value={e.id}>{e.nom}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-black text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
                >
                  🔍 Filtrer
                </button>
              </div>
            </form>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mb-6">
            <BoutonExportPaie
              mois={moisSelectionne}
              annee={anneeSelectionnee}
              entrepriseId={entrepriseSelectionnee}
            />
            {entrepriseSelectionnee && (
              <>
                <BoutonValiderPaie
                  mois={moisSelectionne}
                  annee={anneeSelectionnee}
                  entrepriseId={entrepriseSelectionnee}
                />
                <BoutonResetPaie
                  mois={moisSelectionne}
                  annee={anneeSelectionnee}
                  entrepriseId={entrepriseSelectionnee}
                />
              </>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-500 text-sm">Total variables</p>
              <p className="text-3xl font-bold mt-2">{variables.length}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-500 text-sm">En attente</p>
              <p className="text-3xl font-bold mt-2 text-orange-500">
                {variables.filter(v => v.statut === "En attente").length}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-500 text-sm">Validées</p>
              <p className="text-3xl font-bold mt-2 text-green-500">
                {variables.filter(v => v.statut === "Validé").length}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-gray-500 text-sm">Réinitialisées</p>
              <p className="text-3xl font-bold mt-2 text-gray-500">
                {variables.filter(v => v.statut === "Réinitialisé").length}
              </p>
            </div>
          </div>

          {/* Tableau */}
          <div className="bg-white rounded-xl shadow p-8">
            <h2 className="text-xl font-bold mb-6">
              Variables — {MOIS[moisSelectionne - 1]} {anneeSelectionnee}
            </h2>
            {variables.length === 0 ? (
              <p className="text-gray-500">Aucune variable pour cette période.</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Entreprise</th>
                    <th className="pb-3">Salarié</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Valeur</th>
                    <th className="pb-3">Commentaire</th>
                    <th className="pb-3">Statut</th>
                    <th className="pb-3">Saisi le</th>
                  </tr>
                </thead>
                <tbody>
                  {variables.map((v) => (
                    <tr key={v.id} className="border-b hover:bg-gray-50 transition">
                      <td className="py-3 text-sm">{v.entreprise.nom}</td>
                      <td className="py-3">{v.salarie.prenom} {v.salarie.nom}</td>
                      <td className="py-3">{formatType(v.type)}</td>
                      <td className="py-3 font-semibold">{formatValeur(v.type, v.valeur)}</td>
                      <td className="py-3 text-gray-500 text-sm">{v.commentaire || "—"}</td>
                      <td className="py-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          v.statut === "En attente" ? "bg-orange-100 text-orange-600" :
                          v.statut === "Validé" ? "bg-green-100 text-green-600" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {v.statut}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500 text-sm">
                        {new Date(v.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}

function formatType(type: string) {
  const types: Record<string, string> = {
    HEURE_SUPPLEMENTAIRE: "⏰ Heures supp.",
    PRIME: "💰 Prime",
    ABSENCE: "🏖️ Absence",
    NOTE_FRAIS: "🧾 Note de frais",
    ACOMPTE: "💳 Acompte",
  };
  return types[type] || type;
}

function formatValeur(type: string, valeur: number) {
  if (type === "HEURE_SUPPLEMENTAIRE") return `${valeur}h`;
  if (type === "ABSENCE") return `${valeur} jour(s)`;
  return `${valeur} €`;
}