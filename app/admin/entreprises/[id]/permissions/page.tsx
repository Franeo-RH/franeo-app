import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import BoutonPermissions from "@/components/BoutonPermissions";

const MODULES = [
  { id: "salaries", label: "👥 Salariés", description: "Accès à la gestion des salariés" },
  { id: "paie", label: "💰 Paie", description: "Accès au module paie et variables" },
  { id: "tickets", label: "🎫 Tickets RH", description: "Accès au système de tickets" },
  { id: "absences", label: "🏖️ Absences", description: "Accès à la gestion des absences" },
  { id: "entreprise", label: "🏢 Mon entreprise", description: "Accès aux infos entreprise et abonnement" },
];

export default async function PermissionsEntreprise({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const { id } = await params;

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const entreprise = await prisma.entreprise.findUnique({
    where: { id },
  });

  if (!entreprise) redirect("/admin/entreprises");

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">🔐 Permissions</h1>
              <p className="text-gray-500 mt-1">{entreprise.nom}</p>
            </div>
            <Link
              href={`/admin/entreprises/${id}`}
              className="bg-white border px-5 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              ← Retour
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow p-8">
            <p className="text-gray-500 mb-6">
              Activez ou désactivez les modules auxquels ce client a accès.
            </p>
            <div className="flex flex-col gap-4">
              {MODULES.map((module) => (
                <div key={module.id} className="flex justify-between items-center border-b pb-4">
                  <div>
                    <p className="font-semibold">{module.label}</p>
                    <p className="text-gray-500 text-sm">{module.description}</p>
                  </div>
                  <BoutonPermissions
                    entrepriseId={id}
                    moduleId={module.id}
                    actif={entreprise.permissions.includes(module.id)}
                  />
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}