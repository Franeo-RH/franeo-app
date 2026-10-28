import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BoutonDemandeEvolution from "@/components/BoutonDemandeEvolution";
import MentionsFacturation from "@/components/MentionsFacturation";

export default async function AbonnementClient() {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");

  const entreprise = await prisma.entreprise.findUnique({
    where: { id: session.entrepriseId! },
    include: { abonnement: true },
  });

  if (!entreprise) redirect("/login");

  const abonnements = await prisma.abonnement.findMany({
    orderBy: { prixMensuel: "asc" },
  });

  const demandeEnAttente = await prisma.demandeEvolution.findFirst({
    where: {
      entrepriseId: session.entrepriseId!,
      statut: "En attente",
    },
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} permissions={session.entreprise?.permissions || []} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h1 className="text-3xl font-bold">💳 Abonnement</h1>
            <p className="text-gray-500 mt-1">
              Formule actuelle : <span className="text-orange-500 font-bold">{entreprise.abonnement?.nom}</span>
            </p>
          </div>

          {demandeEnAttente && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-6">
              <p className="text-orange-600 font-semibold">
                ⏳ Vous avez une demande d'évolution en attente de validation par Franeo.
              </p>
            </div>
          )}

          <div className="grid grid-cols-4 gap-6">
            {abonnements.map((a) => (
              <div
                key={a.id}
                className={`bg-white rounded-xl shadow p-6 flex flex-col gap-4 ${
                  a.id === entreprise.abonnementId
                    ? "border-2 border-orange-500"
                    : ""
                }`}
              >
                <div>
                  <h2 className="text-xl font-bold">{a.nom}</h2>
                  <p className="text-3xl font-bold text-orange-500 mt-2">
                    {a.prixMensuel} €
                    <span className="text-gray-400 text-sm font-normal">/mois</span>
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    {a.ticketsRH === 0
                      ? `Sans tickets RH (${a.prixTicketSupp}€/ticket)`
                      : `${a.ticketsRH} tickets RH/mois (${a.prixTicketSupp}€/ticket supp.)`}
                  </p>
                </div>

                <ul className="flex flex-col gap-2 flex-1">
                  {a.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-orange-500 mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {a.id === entreprise.abonnementId ? (
                  <span className="bg-orange-100 text-orange-600 text-center py-2 rounded-lg font-semibold text-sm">
                    ✅ Formule actuelle
                  </span>
                ) : (
                  <BoutonDemandeEvolution
                    entrepriseId={entreprise.id}
                    abonnementId={a.id}
                    disabled={!!demandeEnAttente}
                  />
                )}
              </div>
            ))}
          </div>

          <MentionsFacturation />
        </main>
      </div>
    </div>
  );
}