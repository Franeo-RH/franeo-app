import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import BoutonExport from "@/components/BoutonExport";
import { BoutonExportComplet } from "@/components/OutilsAdmin";

export default async function AdminEntreprises() {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");



  // Requêtes lancées en même temps
  const [entreprises, demandesEnAttente] = await Promise.all([
    prisma.entreprise.findMany({
      where: { demo: false },
      include: {
        abonnement: true,
        _count: {
          select: {
            salaries: true,
            utilisateurs: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.demandeEvolution.count({
      where: { statut: "En attente", entreprise: { demo: false } },
    }),
  ]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} demandesEnAttente={demandesEnAttente} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">🏢 Entreprises</h1>
              <p className="text-gray-500 mt-1">{entreprises.filter((e) => e.actif).length} active(s) · {entreprises.filter((e) => !e.actif).length} suspendue(s)</p>
            </div>
            <div className="flex gap-3">
              <BoutonExportComplet jeu="entreprises" label="📥 Export complet (entreprises + comptes)" />
              <BoutonExportComplet jeu="comptes" label="📥 Comptes utilisateurs" />
              <Link
                href="/admin/entreprises/nouveau"
                className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-orange-600 transition"
              >
                + Ajouter une entreprise
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-8">
            {entreprises.length === 0 ? (
              <p className="text-gray-500">Aucune entreprise pour le moment.</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Entreprise</th>
                    <th className="pb-3">Abonnement</th>
                    <th className="pb-3">Salariés</th>
                    <th className="pb-3">Utilisateurs</th>
                    <th className="pb-3">Ville</th>
                    <th className="pb-3">Statut</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {entreprises.map((e) => (
                    <tr key={e.id} className={`border-b hover:bg-gray-50 transition ${e.actif ? "" : "opacity-60"}`}>
                      <td className="py-3 font-semibold">{e.nom}</td>
                      <td className="py-3">
                        <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-semibold">
                          {e.abonnement?.nom || "—"}
                        </span>
                      </td>
                      <td className="py-3">{e._count.salaries}</td>
                      <td className="py-3">{e._count.utilisateurs}</td>
                      <td className="py-3">{e.ville || "—"}</td>
                      <td className="py-3">
                        <span style={e.actif ? { backgroundColor: "#dcfce7", color: "#15803d" } : { backgroundColor: "#fef9c3", color: "#a16207" }} className="px-3 py-1 rounded-full text-xs font-semibold">
                          {e.actif ? "Active" : "⏸️ Suspendue"}
                        </span>
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/admin/entreprises/${e.id}`}
                          className="text-orange-500 font-semibold hover:underline"
                        >
                          Voir →
                        </Link>
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