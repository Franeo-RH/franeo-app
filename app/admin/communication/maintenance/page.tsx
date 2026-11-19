import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import MaintenanceAdmin from "@/components/MaintenanceAdmin";
import { etatMaintenance, oublierMaintenance } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

/** Admin › Communication › Maintenance & mises à jour */
export default async function AdminMaintenance() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");
  oublierMaintenance();
  const [r, etat] = await Promise.all([prisma.reglageApp.findUnique({ where: { id: "global" } }).catch(() => null), etatMaintenance()]);
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-6 md:p-10 flex flex-col gap-6" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-3xl font-bold">🛠️ Maintenance & mises à jour</h1>
            <p className="text-gray-500 mt-1">Annoncez une mise à jour, bloquez l&apos;application le temps de la publier, puis rouvrez-la.</p>
          </div>
          <MaintenanceAdmin etat={{
            active: !!r?.maintenanceActive, message: r?.maintenanceMessage ?? "",
            debut: r?.maintenanceDebut?.toISOString() ?? "", fin: r?.maintenanceFin?.toISOString() ?? "",
            bloque: etat.bloque, annonce: etat.annonce,
          }} />
        </main>
      </div>
    </div>
  );
}
