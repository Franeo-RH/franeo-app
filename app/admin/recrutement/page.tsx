import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BoutonStatutRecrutement from "@/components/BoutonStatutRecrutement";
import BoutonSupprimerRecrutement from "@/components/BoutonSupprimerRecrutement";

export const dynamic = "force-dynamic";

const STATUTS = ["Reçue", "En cours", "Candidats proposés", "Clôturée"];

export default async function AdminRecrutement() {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const recrutements = await prisma.demandeRecrutement.findMany({
    where: { entreprise: { demo: false } },
    include: { entreprise: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h1 className="text-3xl font-bold">🎯 Demandes de recrutement</h1>
            <p className="text-gray-500 mt-1">{recrutements.length} demande(s) au total</p>
          </div>

          {recrutements.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
              Aucune demande de recrutement pour le moment.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {recrutements.map(r => (
                <div key={r.id} className="bg-white rounded-xl shadow p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold">{r.poste}</h2>
                      <p className="text-gray-500 mt-1">{r.entreprise.nom} — {r.typeContrat}</p>
                      <p className="text-gray-400 text-sm mt-1">Reçue le {new Date(r.createdAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <BoutonStatutRecrutement id={r.id} statutActuel={r.statut} statuts={STATUTS} />
                      <BoutonSupprimerRecrutement id={r.id} poste={r.poste} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6 mb-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 font-semibold uppercase mb-2">💰 Rémunération</p>
                      <p className="font-semibold">
                        {r.salaireMini && r.salaireMaxi ? `${r.salaireMini} — ${r.salaireMaxi} €/mois` : "Non précisé"}
                      </p>
                      {r.primes && <p className="text-sm text-gray-500 mt-1">{r.primes}</p>}
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 font-semibold uppercase mb-2">🎓 Profil</p>
                      <p className="text-sm font-semibold">{r.experience || "—"}</p>
                      <p className="text-sm text-gray-500">{r.formation || "—"}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 font-semibold uppercase mb-2">📅 Démarrage</p>
                      <p className="font-semibold">{r.dateDebut ? new Date(r.dateDebut).toLocaleDateString("fr-FR") : "Dès que possible"}</p>
                      {r.commentaire && <p className="text-sm text-gray-500 mt-1">{r.commentaire}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-bold mb-2">📋 Missions</p>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{r.missions}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold mb-2">👤 Profil recherché</p>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{r.profil}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 flex-wrap">
                    {STATUTS.map(s => (
                      <span key={s} className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        r.statut === s ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-400"
                      }`}>
                        {s}
                      </span>
                    ))}
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