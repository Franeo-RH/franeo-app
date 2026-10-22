import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HistoriqueRecrutement() {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");

  const recrutements = await prisma.demandeRecrutement.findMany({
    where: { entrepriseId: session.entrepriseId! },
    orderBy: { createdAt: "desc" },
  });

  const couleurStatut = (statut: string) => {
    if (statut === "Clôturée") return "bg-green-100 text-green-600";
    if (statut === "Candidats proposés") return "bg-blue-100 text-blue-600";
    if (statut === "En cours") return "bg-orange-100 text-orange-600";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} permissions={session.entreprise?.permissions || []} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">🎯 Mes demandes de recrutement</h1>
              <p className="text-gray-500 mt-1">{recrutements.length} demande(s) au total</p>
            </div>
            <Link href="/client/tickets/recrutement" className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-orange-600 transition">
              ➕ Nouvelle demande
            </Link>
          </div>

          {recrutements.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
              Aucune demande de recrutement pour le moment.
              <Link href="/client/tickets/recrutement" className="block mt-4 text-orange-500 font-semibold hover:underline">
                Faire une demande →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {recrutements.map(r => (
                <div key={r.id} className="bg-white rounded-xl shadow p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold">{r.poste}</h2>
                      <p className="text-gray-500 text-sm mt-1">{r.typeContrat} — {r.salaireMini && r.salaireMaxi ? `${r.salaireMini} — ${r.salaireMaxi} €/mois` : "Salaire non précisé"}</p>
                      <p className="text-gray-400 text-xs mt-1">Demande envoyée le {new Date(r.createdAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${couleurStatut(r.statut)}`}>
                      {r.statut}
                    </span>
                  </div>

                  {/* Timeline statut */}
                  <div className="mt-4 flex gap-2 items-center">
                    {["Reçue", "En cours", "Candidats proposés", "Clôturée"].map((s, i, arr) => {
                      const estActuel = r.statut === s;
                      const estPasse = arr.indexOf(r.statut) > i;
                      return (
                        <div key={s} className="flex items-center gap-2">
                          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            estActuel ? "bg-orange-500 text-white" :
                            estPasse ? "bg-green-100 text-green-600" :
                            "bg-gray-100 text-gray-400"
                          }`}>
                            {estPasse ? "✓" : ""} {s}
                          </div>
                          {i < arr.length - 1 && <span className="text-gray-300">→</span>}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <p className="font-semibold text-gray-700 mb-1">Missions</p>
                      <p className="line-clamp-2">{r.missions}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700 mb-1">Profil recherché</p>
                      <p className="line-clamp-2">{r.profil}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-orange-600">
                    <span>💶</span>
                    <span className="font-semibold">Surfacturation de 400 € appliquée sur la facture du mois de la demande</span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}