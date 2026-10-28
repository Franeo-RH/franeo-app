import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BoutonsDecision from "@/components/BoutonsDecision";
import BoutonsDecisionPaie from "@/components/BoutonsDecisionPaie";
import Link from "next/link";
import OngletsAbonnements from "@/components/OngletsAbonnements";
import ForcerAbonnement from "@/components/ForcerAbonnement";

export const dynamic = "force-dynamic";

export default async function DemandesAbonnement() {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");



  // Requêtes lancées en même temps
  const [demandes, demandesPaie, abonnements] = await Promise.all([
    prisma.demandeEvolution.findMany({
      where: { entreprise: { demo: false } },
      include: { entreprise: { include: { abonnement: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.demandeEvolutionPaie.findMany({
      where: { entreprise: { demo: false } },
      include: {
        entreprise: { include: { abonnementPaie: true } },
        ancienneFormule: true,
        nouvelleFormule: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.abonnement.findMany(),
  ]);
  const [entreprisesForcage, formulesPaie] = await Promise.all([
    prisma.entreprise.findMany({ where: { demo: false }, select: { id: true, nom: true, abonnementId: true, abonnementPaieId: true }, orderBy: { nom: "asc" } }),
    prisma.abonnementPaie.findMany({ select: { id: true, nom: true, prixMensuel: true }, orderBy: { prixMensuel: "asc" } }),
  ]);

  const demandesEnAttente = demandes.filter(d => d.statut === "En attente").length;
  const demandesPaieEnAttente = demandesPaie.filter(d => d.statut === "EN_ATTENTE").length;
  const totalEnAttente = demandesEnAttente + demandesPaieEnAttente;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} demandesEnAttente={totalEnAttente} />
        <main className="flex-1 p-10">
          <OngletsAbonnements espace="admin" actif="rh" />
          <ForcerAbonnement
            entreprises={entreprisesForcage}
            packsRH={[...abonnements].sort((a, b) => a.prixMensuel - b.prixMensuel).map((a) => ({ id: a.id, nom: a.nom, prixMensuel: a.prixMensuel }))}
            formulesPaie={formulesPaie}
          />

          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h1 className="text-3xl font-bold">📩 Demandes de modification d'abonnement</h1>
            <p className="text-gray-500 mt-1">{totalEnAttente} demande(s) en attente</p>
          </div>

          {/* Demandes RH */}
          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h2 className="text-xl font-bold mb-4">🏢 Abonnements RH</h2>
            {demandes.length === 0 ? (
              <p className="text-gray-500">Aucune demande pour le moment.</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Entreprise</th>
                    <th className="pb-3">Abonnement actuel</th>
                    <th className="pb-3">Demande</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Statut</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {demandes.map((d) => {
                    const abonnementDemande = abonnements.find(a => a.id === d.abonnementId);
                    return (
                      <tr key={d.id} className="border-b hover:bg-gray-50 transition">
                        <td className="py-3 font-semibold">
                          <Link href={`/admin/entreprises/${d.entrepriseId}`} className="text-orange-500 hover:underline">
                            {d.entreprise.nom}
                          </Link>
                        </td>
                        <td className="py-3">{d.entreprise.abonnement?.nom || "—"}</td>
                        <td className="py-3 font-semibold text-orange-500">{abonnementDemande?.nom || "—"}</td>
                        <td className="py-3 text-gray-500 text-sm">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</td>
                        <td className="py-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            d.statut === "En attente" ? "bg-orange-100 text-orange-600" :
                            d.statut === "Acceptée" ? "bg-green-100 text-green-600" :
                            "bg-red-100 text-red-600"
                          }`}>
                            {d.statut}
                          </span>
                        </td>
                        <td className="py-3">
                          {d.statut === "En attente" && (
                            <BoutonsDecision
                              demandeId={d.id}
                              entrepriseId={d.entrepriseId}
                              abonnementId={d.abonnementId}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Demandes Paie */}
          <div className="bg-white rounded-xl shadow p-8">
            <h2 className="text-xl font-bold mb-4">📦 Abonnements Paie</h2>
            {demandesPaie.length === 0 ? (
              <p className="text-gray-500">Aucune demande pour le moment.</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Entreprise</th>
                    <th className="pb-3">Formule actuelle</th>
                    <th className="pb-3">Demande</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Statut</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {demandesPaie.map((d) => (
                    <tr key={d.id} className="border-b hover:bg-gray-50 transition">
                      <td className="py-3 font-semibold">
                        <Link href={`/admin/entreprises/${d.entrepriseId}`} className="text-orange-500 hover:underline">
                          {d.entreprise.nom}
                        </Link>
                      </td>
                      <td className="py-3">{d.ancienneFormule?.nom || "—"}</td>
                      <td className="py-3 font-semibold text-orange-500">{d.nouvelleFormule.nom}</td>
                      <td className="py-3 text-gray-500 text-sm">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="py-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          d.statut === "EN_ATTENTE" ? "bg-orange-100 text-orange-600" :
                          d.statut === "VALIDEE" ? "bg-green-100 text-green-600" :
                          "bg-red-100 text-red-600"
                        }`}>
                          {d.statut === "EN_ATTENTE" ? "En attente" : d.statut === "VALIDEE" ? "Validée" : "Refusée"}
                        </span>
                      </td>
                      <td className="py-3">
                        {d.statut === "EN_ATTENTE" && (
                          <BoutonsDecisionPaie demandeId={d.id} />
                        )}
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