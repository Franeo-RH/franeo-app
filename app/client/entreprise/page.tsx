import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import GestionEtablissements from "@/components/GestionEtablissements";
import AccesEtablissements from "@/components/AccesEtablissements";
import AvantagesEntreprise from "@/components/AvantagesEntreprise";
import LogoEntreprise from "@/components/LogoEntreprise";
import { aDroit } from "@/lib/droits";
import { etatOptions } from "@/lib/options-serveur";
import { calculerFacture } from "@/lib/facturation";
import OptionDocuments from "@/components/OptionDocuments";
import OptionMedical from "@/components/OptionMedical";
import OptionProjets from "@/components/OptionProjets";
import MandatPrelevement from "@/components/MandatPrelevement";
import { stripeActif } from "@/lib/stripe";
import { enregistrerMandat } from "@/lib/prelevement";

export default async function EntrepriseClient({ searchParams }: { searchParams: Promise<{ mandat?: string; session?: string }> }) {
  await connection();
  const { mandat, session: sessionStripe } = await searchParams;

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");

  if (!session.entreprise?.permissions.includes("entreprise")) {
    redirect("/client/dashboard");
  }

  // Retour de la page Stripe : le mandat est enregistré tout de suite (le webhook fait de même en arrière-plan)
  if (mandat === "ok" && sessionStripe && stripeActif()) {
    await enregistrerMandat(sessionStripe, session.entrepriseId!).catch((e) => console.error("Mandat Stripe :", e));
  }

  const entreprise = await prisma.entreprise.findUnique({
    where: { id: session.entrepriseId! },
    include: { abonnement: true, abonnementPaie: true },
  });

  if (!entreprise) redirect("/login");

  // Options (prenables à tout moment) et estimation de la facture du mois, options comprises
  const maintenant = new Date();
  const dirigeant = !session.etablissementId;
  const [options, estimation] = dirigeant
    ? await Promise.all([etatOptions(session), aDroit(session.entreprise?.permissions, "entreprise.supplements") ? calculerFacture(entreprise.id, maintenant.getMonth() + 1, maintenant.getFullYear()) : Promise.resolve(null)])
    : [null, null];

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} permissions={session.entreprise?.permissions || []} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">🏢 {entreprise.nom}</h1>
              <p className="text-gray-500 mt-1">Informations de votre entreprise</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link href="/client/entreprise/devis?type=AUDIT" className="bg-white border-2 border-black px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition">🔍 Demander un audit RH</Link>
              <Link href="/client/entreprise/devis?type=FORMATION" className="px-4 py-2 rounded-lg font-semibold text-white transition" style={{ background: "#17a34a" }}>🎓 Demander une formation</Link>
              <Link href="/client/entreprise/modifier" className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-orange-600 transition">✏️ Modifier</Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">📋 Informations générales</h2>
              <div className="flex flex-col gap-3">
                <Info label="Nom" value={entreprise.nom} />
                <Info label="SIRET" value={entreprise.siret} />
                <Info label="Email" value={entreprise.email} />
                <Info label="Téléphone" value={entreprise.telephone} />
                <Info label="Site web" value={entreprise.siteWeb} />
                <Info label="Convention collective (CCN)" value={entreprise.ccn} />
                <Info label="Secteur d'activité" value={entreprise.secteur} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">📍 Adresse</h2>
              <div className="flex flex-col gap-3">
                <Info label="Rue" value={entreprise.rue} />
                <Info label="Code postal" value={entreprise.codePostal} />
                <Info label="Ville" value={entreprise.ville} />
                <Info label="Pays" value={entreprise.pays} />
              </div>
            </div>

            {/* Coordonnées bancaires et abonnements : réservés au dirigeant général */}
            {!session.etablissementId && (
              <>
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">🏦 Coordonnées bancaires</h2>
              <div className="flex flex-col gap-3">
                <Info label="Banque" value={entreprise.banque} />
                <Info label="IBAN" value={entreprise.iban} />
                <Info label="BIC" value={entreprise.bic} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">💳 Abonnements Franeo</h2>
              <div className="flex flex-col gap-3">
                <Info label="Formule RH" value={entreprise.abonnement ? `${entreprise.abonnement.nom} — ${entreprise.abonnement.prixMensuel} €/mois` : "Aucune formule RH"} />
                <Info label="Tickets RH inclus / mois" value={entreprise.abonnement?.ticketsRH.toString()} />
                <Info label="Formule paie" value={entreprise.abonnementPaie ? `Paie ${entreprise.abonnementPaie.nom} — ${entreprise.abonnementPaie.prixMensuel} €/mois` : "—"} />
              </div>
              {estimation && (
                <div className="flex justify-between items-baseline mt-3 rounded-lg px-3 py-2" style={{ background: "#fff7ed" }}>
                  <span className="text-sm text-gray-600">Estimation du mois ({maintenant.toLocaleDateString("fr-FR", { month: "long" })}), options comprises</span>
                  <span className="font-bold text-orange-600">{estimation.montant.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} € HT</span>
                </div>
              )}
              <div className="flex gap-4 flex-wrap mt-4">
                <Link href="/client/entreprise/abonnement" className="text-orange-500 font-semibold hover:underline">Gérer mes abonnements →</Link>
                {estimation && <Link href="/client/entreprise/supplements" className="text-gray-600 font-semibold hover:underline">Détail du mois →</Link>}
              </div>
            </div>

            <MandatPrelevement
              statut={entreprise.mandatStatut}
              ibanFin={entreprise.mandatIbanFin}
              signeAt={entreprise.mandatSigneAt?.toISOString() ?? null}
              disponible={stripeActif() && !entreprise.demo}
              peutSigner={aDroit(session.entreprise?.permissions, "entreprise.modifier")}
              retour={mandat === "ok" || mandat === "annule" ? mandat : null}
            />
              </>
            )}

            {options && (
              <div className="col-span-2 flex flex-col gap-4">
                <div>
                  <h2 className="text-xl font-bold">🧩 Options</h2>
                  <p className="text-sm text-gray-500">Activez ou arrêtez une option à tout moment : elle est ajoutée tout de suite au calcul de votre facture du mois (sauf si votre formule l&apos;inclut).</p>
                </div>
                <OptionDocuments etat={options.documents} inclus={options.documentsInclus} peutDemander={dirigeant} />
                <OptionMedical etat={options.medical} inclus={options.medicalInclus} peutDemander={dirigeant} />
                <OptionProjets etat={options.projets} inclus={options.projetsInclus} peutDemander={dirigeant} />
              </div>
            )}

            <GestionEtablissements modifiable={aDroit(session.entreprise?.permissions, "entreprise.modifier")} />
            {!session.etablissementId && aDroit(session.entreprise?.permissions, "entreprise.modifier") && <AccesEtablissements />}
            <LogoEntreprise modifiable={aDroit(session.entreprise?.permissions, "entreprise.modifier")} />
            <AvantagesEntreprise modifiable={aDroit(session.entreprise?.permissions, "entreprise.modifier")} />
          </div>

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