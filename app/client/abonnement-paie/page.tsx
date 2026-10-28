import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BoutonDemandeEvolutionPaie from "@/components/BoutonDemandeEvolutionPaie";
import MentionsFacturation from "@/components/MentionsFacturation";

export const dynamic = "force-dynamic";

const FORMULES_DETAIL: Record<string, string[]> = {
  ESSENTIELLE: [
    "Application Franeo (ordinateur + téléphone) et assistant Buddy",
    "Bulletins de paie, cotisations & DSN",
    "Absences, congés, heures supplémentaires, primes",
    "Régularisations & rappels de salaire inclus",
    "Simulations de coût d'embauche incluses",
    "Saisies sur salaire incluses",
    "Exports Excel & tableau de bord simple",
    "1 ticket RH par mois",
    "€ Arrivée 45 € · Sortie / solde de tout compte 60 €",
    "€ Bulletin rectificatif 15 € · Attestation maladie 15 €",
    "€ Rupture conventionnelle 120 € · Contrôle URSSAF 150 €",
  ],
  SERENITE: [
    "✦ Tout le Pack Essentielle, plus :",
    "Relance des variables auprès de vous et des salariés",
    "Suivi des échéances : périodes d'essai, CDD, visites médicales",
    "Attestations maladie & suivi des IJSS inclus",
    "Veille paie & réglementaire",
    "3 tickets RH par mois",
    "€ Arrivée 45 € · Sortie / solde de tout compte 60 €",
    "€ Bulletin rectificatif 15 €",
    "€ Rupture conventionnelle 120 € · Contrôle URSSAF 150 €",
  ],
  PREMIUM: [
    "✦ Tout le Pack Sérénité, plus :",
    "Arrivées & soldes de tout compte INCLUS",
    "Bulletins rectificatifs inclus",
    "Conseil paie ponctuel",
    "Tableau de bord masse salariale complet",
    "Rendez-vous paie trimestriel",
    "Reprise de dossier offerte",
    "6 tickets RH par mois",
    "€ Rupture conventionnelle 90 € · Relance IJSS 20 €/dossier",
    "€ Contrôle URSSAF 150 €",
  ],
  ENTREPRISE: [
    "✦ Tout le Pack Premium, plus :",
    "Ruptures conventionnelles incluses",
    "Relance & recouvrement des IJSS inclus",
    "Assistance en cas de contrôle URSSAF incluse",
    "Rendez-vous paie mensuel",
    "Paramétrage mutuelle / prévoyance offert",
    "10 tickets RH par mois",
  ],
};

export default async function ClientAbonnementPaie() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");
  if (!session.entreprise?.permissions.includes("paie")) redirect("/client/dashboard");

  const entreprise = await prisma.entreprise.findUnique({
    where: { id: session.entrepriseId! },
    include: { abonnementPaie: true },
  });

  if (!entreprise) redirect("/login");

  const formules = await prisma.abonnementPaie.findMany({
    orderBy: { prixMensuel: "asc" },
  });

  const demandeEnAttente = await prisma.demandeEvolutionPaie.findFirst({
    where: { entrepriseId: session.entrepriseId!, statut: "EN_ATTENTE" },
    include: { nouvelleFormule: true },
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} permissions={session.entreprise?.permissions || []} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h1 className="text-3xl font-bold">📦 Abonnement Paie</h1>
            <p className="text-gray-500 mt-1">
              Formule actuelle :{" "}
              {entreprise.abonnementPaie ? (
                <span className="text-orange-500 font-bold">{entreprise.abonnementPaie.nom}</span>
              ) : (
                <span className="text-gray-400">Aucune formule attribuée</span>
              )}
            </p>
          </div>

          {demandeEnAttente && (
            <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-xl px-6 py-4 mb-6 flex items-center gap-3">
              ⏳ Une demande de passage à la formule <strong className="mx-1">{demandeEnAttente.nouvelleFormule.nom}</strong> est en attente de validation par votre gestionnaire.
            </div>
          )}

          <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {formules.map((f) => {
              const estActuelle = f.id === entreprise.abonnementPaieId;
              const estDemandee = f.id === demandeEnAttente?.nouvelleFormuleId;
              const features = FORMULES_DETAIL[f.code] || [];

              return (
                <div
                  key={f.id}
                  className={`bg-white rounded-xl shadow p-6 flex flex-col gap-4 ${
                    estActuelle ? "border-2 border-orange-500" : ""
                  }`}
                >
                  <div>
                    <h2 className="text-xl font-bold">{f.nom}</h2>
                    <p className="text-3xl font-bold text-orange-500 mt-2">
                      {f.prixMensuel} €
                      <span className="text-gray-400 text-sm font-normal">/mois</span>
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      {f.bulletinsInclus} bulletins inclus · {f.prixBulletinSupp} €/bulletin supp.
                      <br />
                      {f.ticketsRHInclus} ticket(s) RH/mois · {f.prixTicketSupp} €/ticket supp.
                    </p>
                  </div>

                  <ul className="flex flex-col gap-2 flex-1">
                    {features.map((feat, i) => (
                      <li
                        key={i}
                        className={`flex items-start gap-2 text-sm ${
                          feat.startsWith("✦")
                            ? "font-bold text-orange-500 mt-1"
                            : "text-gray-600"
                        }`}
                      >
                        {feat.startsWith("€ ") ? (
                          <span style={{ color: "#6b7280" }} className="mt-0.5">€</span>
                        ) : !feat.startsWith("✦") ? (
                          <span className="text-orange-500 mt-0.5">✓</span>
                        ) : null}
                        {feat.startsWith("€ ") ? <span style={{ color: "#6b7280" }}>{feat.slice(2)}</span> : feat}
                      </li>
                    ))}
                  </ul>

                  {estActuelle ? (
                    <span className="bg-orange-100 text-orange-600 text-center py-2 rounded-lg font-semibold text-sm">
                      ✅ Formule actuelle
                    </span>
                  ) : estDemandee ? (
                    <span className="bg-yellow-100 text-yellow-700 text-center py-2 rounded-lg font-semibold text-sm">
                      ⏳ Demande en attente
                    </span>
                  ) : (
                    <BoutonDemandeEvolutionPaie
                      formuleId={f.id}
                      formuleNom={f.nom}
                      prixActuel={entreprise.abonnementPaie?.prixMensuel || 0}
                      prixNouveau={f.prixMensuel}
                      demandeEnAttente={!!demandeEnAttente}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-center text-gray-400 text-sm mt-8">
            Votre gestionnaire traitera votre demande sous 48h.
          </p>

          <MentionsFacturation logiciel />
        </main>
      </div>
    </div>
  );
}