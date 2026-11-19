import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import FicheCabinetAdmin from "@/components/cabinet/FicheCabinetAdmin";
import CollaborateursCabinet from "@/components/cabinet/CollaborateursCabinet";
import { collaborateursDe } from "@/lib/cabinet";

export const dynamic = "force-dynamic";

export default async function AdminFicheCabinet({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");
  const { id } = await params;

  const cabinet = await prisma.cabinet.findUnique({ where: { id } });
  if (!cabinet) redirect("/admin/entreprises/cabinets");
  const [entreprises, collaborateurs] = await Promise.all([
    prisma.entreprise.findMany({
      where: cabinet.demo ? { cabinetId: id } : { demo: false },
      select: { id: true, nom: true, cabinetId: true, cabinet: { select: { nom: true } } },
      orderBy: { nom: "asc" },
    }),
    collaborateursDe(id),
  ]);
  const clients = entreprises.filter((e) => e.cabinetId === id).map((e) => ({ id: e.id, nom: e.nom }));

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10 flex flex-col gap-6">
          <div className="bg-white rounded-xl shadow p-8 flex justify-between items-center gap-3 flex-wrap">
            <div>
              <Link href="/admin/entreprises/cabinets" className="text-sm text-gray-500 hover:underline">← Cabinets</Link>
              <h1 className="text-3xl font-bold">🏛️ {cabinet.nom}</h1>
              <p className="text-gray-500 mt-1">{cabinet.demo ? "Cabinet de démonstration" : cabinet.actif ? "Accès actif" : "⏸️ Accès suspendu"}</p>
            </div>
          </div>
          <FicheCabinetAdmin
            cabinet={cabinet}
            entreprises={entreprises.map((e) => ({ id: e.id, nom: e.nom, cabinetId: e.cabinetId, autreCabinet: e.cabinetId && e.cabinetId !== id ? e.cabinet?.nom ?? null : null }))}
          />
          <CollaborateursCabinet collaborateurs={collaborateurs} clients={clients} adminCabinetId={id} demo={cabinet.demo} />
        </main>
      </div>
    </div>
  );
}
