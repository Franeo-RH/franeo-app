import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import CadreAdmin from "@/components/CadreAdmin";
import RegistrePersonnel from "@/components/RegistrePersonnel";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { COLONNES_RUP, registrePersonnel } from "@/lib/rup";

export const dynamic = "force-dynamic";

/** Admin › fiche client › Registre unique du personnel */
export default async function PageRegistreAdmin({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");
  const { id } = await params;
  const e = await prisma.entreprise.findUnique({ where: { id }, select: { nom: true } });
  if (!e) notFound();
  const lignes = await registrePersonnel(id);
  return (
    <CadreAdmin>
      <div className="bg-white rounded-xl shadow p-6">
        <Link href={`/admin/entreprises/${id}`} className="text-sm text-orange-600 font-semibold fr-pas-imprimer">← {e.nom}</Link>
        <h1 className="text-3xl font-bold mt-1">📒 Registre unique du personnel — {e.nom}</h1>
        <p className="text-gray-500 mt-1">Généré le {new Date().toLocaleDateString("fr-FR")} à partir des fiches salariés.</p>
      </div>
      <div className="bg-white rounded-xl shadow p-6">
        <RegistrePersonnel entreprise={e.nom} colonnes={COLONNES_RUP} lignes={lignes} modifiable entrepriseId={id} />
      </div>
    </CadreAdmin>
  );
}
