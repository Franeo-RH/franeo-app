import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import CadreAdmin from "@/components/CadreAdmin";
import EditeurTrameEntretien from "@/components/EditeurTrameEntretien";

export const dynamic = "force-dynamic";

/** Admin › Documentaire › Modèles d'entretien */
export default async function PageTramesEntretien() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");
  const entreprises = await prisma.entreprise.findMany({ where: { actif: true }, select: { id: true, nom: true }, orderBy: { nom: "asc" } });
  return (
    <CadreAdmin>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">🗣️ Modèles d&apos;entretien</h1>
        <p className="text-gray-500 mt-1">Rubriques du compte rendu, par type d&apos;entretien (annuel, professionnel, bilan 6 ans). Le modèle FRANEO RH s&apos;applique à tous les clients, sauf à ceux qui ont leur propre trame (réglée ici ou par le client dans Gestion RH › Entretiens).</p>
      </div>
      <div className="bg-white rounded-xl shadow p-6"><EditeurTrameEntretien entreprises={entreprises} /></div>
    </CadreAdmin>
  );
}
