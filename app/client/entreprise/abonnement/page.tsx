import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BoutonDemandeEvolution from "@/components/BoutonDemandeEvolution";
import MentionsFacturation from "@/components/MentionsFacturation";
import OngletsAbonnements from "@/components/OngletsAbonnements";
import Link from "next/link";
import { detailRH } from "@/lib/grille";
import { texteMention, texteRH, textesModifies } from "@/lib/textes-formules";
import OptionProjets from "@/components/OptionProjets";
import OptionDocuments from "@/components/OptionDocuments";
import { etatOptions } from "@/lib/options-serveur";

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

  const [abonnements, modifs] = await Promise.all([
    prisma.abonnement.findMany({ orderBy: { prixMensuel: "asc" } }),
    textesModifies(),
  ]);

  const options = await etatOptions(session);

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
          <OngletsAbonnements espace="client" actif="rh" />

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

          <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {abonnements.map((a) => (
              <div
                key={a.id}
                className={`bg-white rounded-xl shadow p-6 flex flex-col gap-4 ${
                  a.id === entreprise.abonnementId
                    ? "border-2 border-orange-500"
                    : detailRH(a.nom)?.recommande ? "border-2 border-black" : ""
                }`}
              >
                <div>
                  {detailRH(a.nom)?.recommande && <span className="inline-block bg-black text-white text-xs font-bold px-2 py-1 rounded-full mb-2">⭐ Recommandée</span>}
                  <h2 className="text-xl font-bold">{a.nom}</h2>
                  <p className="text-3xl font-bold text-orange-500 mt-2">
                    {a.prixMensuel} €
                    <span className="text-gray-400 text-sm font-normal">/mois</span>
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    {a.ticketsRH === 0
                      ? `Tickets RH à la demande (${a.prixTicketSupp}€/ticket)`
                      : `${a.ticketsRH} tickets RH/mois (${a.prixTicketSupp}€/ticket supp.)`}
                  </p>
                </div>

                {texteRH(modifs, a).message && <p className="text-sm italic text-gray-600">{texteRH(modifs, a).message}</p>}
                <ul className="flex flex-col gap-2 flex-1">
                  {texteRH(modifs, a).lignes.map((f, i) => (
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

          <div className="mt-6 flex flex-col gap-4">
            <OptionDocuments etat={options.documents} inclus={options.documentsInclus} peutDemander={!session.etablissementId} />
            <OptionProjets etat={options.projets} inclus={options.projetsInclus} peutDemander={!session.etablissementId} />
          </div>

          <p className="text-sm text-gray-600 mt-6 bg-white rounded-xl shadow p-4">🩺 {texteMention(modifs).message}</p>

          <div className="bg-white rounded-xl shadow p-6 mt-6 flex justify-between items-center gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-bold">Plus de 100 salariés ?</h2>
              <p className="text-gray-500">Devis personnalisé, adapté à votre organisation.</p>
            </div>
            <Link href="/client/entreprise/devis?type=AUTRE" className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold">Demander un devis</Link>
          </div>

          <MentionsFacturation />
        </main>
      </div>
    </div>
  );
}