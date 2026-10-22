import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import BoutonSupprimer from "@/components/BoutonSupprimer";
import RappelsSalarie, { type RappelLite } from "@/components/RappelsSalarie";
import { versISO } from "@/lib/rappels";

export default async function FicheSalarieAdmin({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const { id } = await params;

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const salarie = await prisma.salarie.findUnique({
    where: { id },
    include: { entreprise: true, rappels: { orderBy: { dateEcheance: "asc" } } },
  });

  if (!salarie) redirect("/admin/salaries");

  const rappels: RappelLite[] = salarie.rappels.map((r) => ({
    id: r.id,
    type: r.type,
    libelle: r.libelle,
    commentaire: r.commentaire,
    traite: r.traite,
    date: versISO(r.dateEcheance),
  }));

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">{salarie.prenom} {salarie.nom}</h1>
              <p className="text-gray-500 mt-1">{salarie.poste} — {salarie.entreprise.nom}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                  salarie.statut === "Actif" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                }`}>
                  {salarie.statut}
                </span>
                {salarie.matricule && (
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 text-orange-600">
                    Matricule {salarie.matricule}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Link href={`/admin/salaries/${id}/modifier`} className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-orange-600 transition">
                ✏️ Modifier
              </Link>
              <BoutonSupprimer id={id} redirectUrl="/admin/salaries" />
              <Link href="/admin/salaries" className="bg-white border px-5 py-2 rounded-lg font-semibold hover:bg-gray-100 transition">
                ← Retour
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">👤 Informations personnelles</h2>
              <div className="flex flex-col gap-3">
                <Info label="Matricule" value={salarie.matricule} />
                <Info label="Email" value={salarie.email} />
                <Info label="Téléphone" value={salarie.telephone} />
                <Info label="Date de naissance" value={salarie.dateNaissance ? new Date(salarie.dateNaissance).toLocaleDateString("fr-FR") : null} />
                <Info label="Lieu de naissance" value={salarie.lieuNaissance} />
                <Info label="Nationalité" value={salarie.nationalite} />
                <Info label="N° sécu" value={salarie.numeroSecuriteSociale} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">📍 Adresse</h2>
              <div className="flex flex-col gap-3">
                <Info label="Rue" value={salarie.rue} />
                <Info label="Code postal" value={salarie.codePostal} />
                <Info label="Ville" value={salarie.ville} />
                <Info label="Pays" value={salarie.pays} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">💼 Poste</h2>
              <div className="flex flex-col gap-3">
                <Info label="Poste" value={salarie.poste} />
                <Info label="Type contrat" value={salarie.typeContrat} />
                <Info label="Date début" value={salarie.dateDebut ? new Date(salarie.dateDebut).toLocaleDateString("fr-FR") : null} />
                <Info label="Date fin" value={salarie.dateFin ? new Date(salarie.dateFin).toLocaleDateString("fr-FR") : null} />
                <Info label="Heures hebdo" value={salarie.heuresHebdomadaires ? `${salarie.heuresHebdomadaires}h` : null} />
                <Info label="Manager" value={salarie.manager} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">💰 Salaire</h2>
              <div className="flex flex-col gap-3">
                <Info label="Salaire mensuel" value={salarie.salaireMensuel ? `${salarie.salaireMensuel} €` : null} />
                <Info label="Salaire annuel" value={salarie.salaireAnnuel ? `${salarie.salaireAnnuel} €` : null} />
                <Info label="Primes" value={salarie.primes ? `${salarie.primes} €` : null} />
                <Info label="Avantages" value={salarie.avantages} />
              </div>
            </div>

            <div className="col-span-2">
              <RappelsSalarie
                salarieId={salarie.id}
                initial={rappels}
                finContrat={salarie.dateFin ? { date: versISO(salarie.dateFin), typeContrat: salarie.typeContrat } : null}
              />
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