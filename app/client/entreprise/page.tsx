import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

export default async function EntrepriseClient() {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");

  if (!session.entreprise?.permissions.includes("entreprise")) {
    redirect("/client/dashboard");
  }

  const entreprise = await prisma.entreprise.findUnique({
    where: { id: session.entrepriseId! },
    include: { abonnement: true },
  });

  if (!entreprise) redirect("/login");

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
            <Link
              href="/client/entreprise/modifier"
              className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-orange-600 transition"
            >
              ✏️ Modifier
            </Link>
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

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">🏦 Coordonnées bancaires</h2>
              <div className="flex flex-col gap-3">
                <Info label="Banque" value={entreprise.banque} />
                <Info label="IBAN" value={entreprise.iban} />
                <Info label="BIC" value={entreprise.bic} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">💳 Abonnement Franeo</h2>
              <div className="flex flex-col gap-3">
                <Info label="Formule" value={entreprise.abonnement?.nom} />
                <Info label="Prix mensuel" value={entreprise.abonnement ? `${entreprise.abonnement.prixMensuel} €/mois` : null} />
                <Info label="Tickets RH inclus" value={entreprise.abonnement?.ticketsRH.toString()} />
                <Info label="Tickets utilisés" value={entreprise.ticketsUtilises.toString()} />
              </div>
              <Link href="/client/entreprise/abonnement" className="block mt-4 text-orange-500 font-semibold hover:underline">
                Demander une évolution →
              </Link>
            </div>

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