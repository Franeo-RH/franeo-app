import { connection } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionCabinet, collaborateursDe } from "@/lib/cabinet";
import CollaborateursCabinet from "@/components/cabinet/CollaborateursCabinet";

export const dynamic = "force-dynamic";

export default async function PageCollaborateurs() {
  await connection();
  const session = await getSessionCabinet();
  if (!session) redirect("/login");
  if (!session.modeCabinet.gerant) redirect("/cabinet");
  const [collaborateurs, clients] = await Promise.all([
    collaborateursDe(session.modeCabinet.cabinetId),
    prisma.entreprise.findMany({ where: { cabinetId: session.modeCabinet.cabinetId }, select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <div className="fr-cab-hero">
        <div>
          <p className="fr-cab-petit">Cabinet {session.modeCabinet.nom}</p>
          <h1 className="fr-cab-titre">Collaborateurs</h1>
          <p className="text-gray-600">Chaque collaborateur a son propre accès : choisissez les clients qu&apos;il suit et ce qu&apos;il peut faire dans leurs dossiers.</p>
        </div>
      </div>
      <CollaborateursCabinet collaborateurs={collaborateurs} clients={clients} moiId={session.id} demo={session.modeCabinet.demo} />
    </div>
  );
}
