import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import BoutonsEntreprise from "@/components/BoutonsEntreprise";
import BoutonsDecision from "@/components/BoutonsDecision";
import BoutonsDecisionPaie from "@/components/BoutonsDecisionPaie";
import SelectAbonnementPaieEntreprise from "@/components/SelectAbonnementPaieEntreprise";
import ChampTauxCharges from "@/components/ChampTauxCharges";
import GestionDroits from "@/components/GestionDroits";
import AvantagesEntreprise from "@/components/AvantagesEntreprise";
import LogoEntreprise from "@/components/LogoEntreprise";
import AccesEtablissements from "@/components/AccesEtablissements";
import RepriseConges from "@/components/RepriseConges";
import { STATUTS_MANDAT } from "@/lib/prelevement-textes";
import { BarreOnglets, ONGLETS_FICHE, OngletDemandes, OngletFacturation, OngletJournal, OngletSalaries } from "@/components/FicheEntrepriseOnglets";

export const dynamic = "force-dynamic";

export default async function FicheEntrepriseAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string; du?: string; au?: string }>;
}) {
  await connection();

  const { id } = await params;
  const sp = await searchParams;
  const onglet = ONGLETS_FICHE.some((o) => o.id === sp.onglet) ? sp.onglet! : "infos";

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const entreprise = await prisma.entreprise.findUnique({
    where: { id },
    include: {
      abonnement: true,
      abonnementPaie: true,
      utilisateurs: true,
      _count: { select: { salaries: true } },
      demandesEvolution: { orderBy: { createdAt: "desc" } },
      demandesEvolutionPaie: {
        include: { ancienneFormule: true, nouvelleFormule: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!entreprise) redirect("/admin/entreprises");

  const abonnements = await prisma.abonnement.findMany({
    orderBy: { prixMensuel: "asc" },
  });

  const formulesPaie = await prisma.abonnementPaie.findMany({
    orderBy: { prixMensuel: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">
                🏢 {entreprise.nom}
                {!entreprise.actif && (
                  <span style={{ backgroundColor: "#fef9c3", color: "#a16207" }} className="ml-3 align-middle px-3 py-1 rounded-full text-sm font-semibold">⏸️ Suspendue</span>
                )}
              </h1>
              <p className="text-gray-500 mt-1">{entreprise._count.salaries} salarié(s)</p>
              {!entreprise.actif && (
                <p style={{ color: "#a16207" }} className="text-sm mt-1">
                  Accès bloqué{entreprise.dateSuspension ? ` depuis le ${new Date(entreprise.dateSuspension).toLocaleDateString("fr-FR")}` : ""}
                  {entreprise.motifSuspension ? ` — ${entreprise.motifSuspension}` : ""}. Les données sont conservées.
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Link href={`/admin/entreprises/${id}/acces`} className="bg-gray-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-gray-700 transition">
                👤 Accès
              </Link>
              <a href={`/admin/entreprises/${id}#acces-droits`} className="bg-black text-white px-5 py-2 rounded-lg font-semibold hover:bg-gray-800 transition">
                🔐 Accès & droits
              </a>
              <Link href={`/admin/entreprises/${id}/modifier`} className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-orange-600 transition">
                ✏️ Modifier
              </Link>
              <BoutonsEntreprise id={id} nom={entreprise.nom} actif={entreprise.actif} />
              <Link href="/admin/entreprises" className="bg-white border px-5 py-2 rounded-lg font-semibold hover:bg-gray-100 transition">
                ← Retour
              </Link>
            </div>
          </div>

          <BarreOnglets id={id} actif={onglet} compteurs={{ salaries: entreprise._count.salaries }} />

          {onglet === "salaries" && <OngletSalaries id={id} />}
          {onglet === "facturation" && <OngletFacturation id={id} />}
          {onglet === "demandes" && <OngletDemandes id={id} />}
          {onglet === "journal" && <OngletJournal id={id} du={sp.du} au={sp.au} />}

          {onglet === "infos" && (
          <>
          <div className="grid grid-cols-2 gap-6">

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">📋 Informations générales</h2>
              <div className="flex flex-col gap-3">
                <Info label="SIRET" value={entreprise.siret} />
                <Info label="Email" value={entreprise.email} />
                <Info label="Téléphone" value={entreprise.telephone} />
                <Info label="Site web" value={entreprise.siteWeb} />
                <Info label="Ville" value={entreprise.ville} />
                <Info label="Début du contrat" value={(entreprise.dateDebutContrat ?? entreprise.createdAt).toLocaleDateString("fr-FR")} />
                <Info label="Remise accordée" value={entreprise.remisePct != null ? `${entreprise.remisePct} %` : null} />
                <Info label="Code de parrainage" value={entreprise.codeParrainage} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">💳 Abonnement RH</h2>
              <div className="flex flex-col gap-3">
                <Info label="Formule" value={entreprise.abonnement?.nom} />
                <Info label="Prix" value={entreprise.abonnement ? `${entreprise.abonnement.prixMensuel} €/mois` : null} />
                <Info label="Tickets RH" value={entreprise.abonnement?.ticketsRH.toString()} />
                <Info label="Tickets utilisés" value={entreprise.ticketsUtilises.toString()} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">📦 Abonnement Paie</h2>
              <div className="flex flex-col gap-3 mb-4">
                <Info label="Formule" value={entreprise.abonnementPaie?.nom} />
                <Info label="Prix" value={entreprise.abonnementPaie ? `${entreprise.abonnementPaie.prixMensuel} €/mois` : null} />
                <Info label="Bulletins inclus" value={entreprise.abonnementPaie?.bulletinsInclus.toString()} />
              </div>
              <div className="mb-4">
                <ChampTauxCharges entrepriseId={id} valeur={entreprise.tauxCharges} />
                <p className="text-xs text-gray-400 mt-1">Sert au suivi de la masse salariale (salaires + charges + variables).</p>
              </div>
              <p className="text-sm text-gray-500 mb-2">Modifier la formule :</p>
              <SelectAbonnementPaieEntreprise
                entrepriseId={id}
                formuleActuelleId={entreprise.abonnementPaieId || ""}
                formules={formulesPaie.map((f) => ({ id: f.id, nom: f.nom }))}
              />
            </div>

            <AvantagesEntreprise entrepriseId={id} />
            <LogoEntreprise entrepriseId={id} />
            <AccesEtablissements entrepriseId={id} />
            <div id="conges"><RepriseConges entrepriseId={id} /></div>

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">👤 Accès client</h2>
              <div className="flex flex-col gap-3">
                {entreprise.utilisateurs.map((u) => (
                  <div key={u.id} className="flex justify-between border-b pb-2">
                    <span className="text-gray-500 text-sm">{u.prenom}</span>
                    <span className="font-semibold text-sm">{u.email}</span>
                  </div>
                ))}
                {entreprise.utilisateurs.length === 0 && (
                  <p className="text-gray-500 text-sm">Aucun accès client</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">🏦 Coordonnées bancaires</h2>
              <div className="flex flex-col gap-3">
                <Info label="Banque" value={entreprise.banque} />
                <Info label="IBAN" value={entreprise.iban} />
                <Info label="BIC" value={entreprise.bic} />
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2 text-sm">
                <p className="font-semibold">💶 Prélèvement des abonnements</p>
                <p>
                  {entreprise.mandatStatut ? STATUTS_MANDAT[entreprise.mandatStatut]?.label ?? entreprise.mandatStatut : "⚠️ Mandat pas encore signé"}
                  {entreprise.mandatIbanFin ? ` · IBAN •••• ${entreprise.mandatIbanFin}` : ""}
                  {entreprise.mandatSigneAt ? ` · signé le ${entreprise.mandatSigneAt.toLocaleDateString("fr-FR")}` : ""}
                </p>
                {entreprise.stripeClientId && (
                  <a href={`https://dashboard.stripe.com/customers/${entreprise.stripeClientId}`} target="_blank" rel="noopener noreferrer" className="text-orange-500 font-semibold hover:underline">
                    Ouvrir le client dans Stripe (lancer un prélèvement) ↗
                  </a>
                )}
              </div>
            </div>

            <div id="acces-droits" className="bg-white rounded-xl shadow p-6 col-span-2">
              <h2 className="text-lg font-bold mb-4">🔐 Accès & droits du client</h2>
              <GestionDroits entrepriseId={id} permissions={entreprise.permissions} clientPaie={!!entreprise.abonnementPaieId && !entreprise.demo} />
            </div>

          </div>

          {entreprise.demandesEvolution.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6 mt-6">
              <h2 className="text-lg font-bold mb-4">📩 Demandes d'évolution RH</h2>
              <div className="flex flex-col gap-3">
                {entreprise.demandesEvolution.map((d) => {
                  const abonnementDemande = abonnements.find((a) => a.id === d.abonnementId);
                  return (
                    <div key={d.id} className="flex justify-between items-center border-b pb-3">
                      <div>
                        <p className="font-semibold">Demande : {abonnementDemande?.nom}</p>
                        <p className="text-gray-500 text-sm">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          d.statut === "En attente" ? "bg-orange-100 text-orange-600" :
                          d.statut === "Acceptée" ? "bg-green-100 text-green-600" :
                          "bg-red-100 text-red-600"
                        }`}>
                          {d.statut}
                        </span>
                        {d.statut === "En attente" && (
                          <BoutonsDecision demandeId={d.id} entrepriseId={id} abonnementId={d.abonnementId} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {entreprise.demandesEvolutionPaie.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6 mt-6">
              <h2 className="text-lg font-bold mb-4">📦 Demandes d'évolution Paie</h2>
              <div className="flex flex-col gap-3">
                {entreprise.demandesEvolutionPaie.map((d) => (
                  <div key={d.id} className="flex justify-between items-center border-b pb-3">
                    <div>
                      <p className="font-semibold">
                        {d.ancienneFormule?.nom || "Aucune"} → {d.nouvelleFormule.nom}
                      </p>
                      <p className="text-gray-500 text-sm">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        d.statut === "EN_ATTENTE" ? "bg-orange-100 text-orange-600" :
                        d.statut === "VALIDEE" ? "bg-green-100 text-green-600" :
                        "bg-red-100 text-red-600"
                      }`}>
                        {d.statut === "EN_ATTENTE" ? "En attente" : d.statut === "VALIDEE" ? "Validée" : "Refusée"}
                      </span>
                      {d.statut === "EN_ATTENTE" && <BoutonsDecisionPaie demandeId={d.id} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          </>
          )}

        </main>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between border-b pb-2">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="font-semibold text-sm">{value || "—"}</span>
    </div>
  );
}