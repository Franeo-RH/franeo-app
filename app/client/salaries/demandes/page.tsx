import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import StatutDemande from "@/components/StatutDemande";
import { LIBELLES_TYPE } from "@/lib/demandes-salaries";

export const dynamic = "force-dynamic";

export default async function ClientDemandesSalaries({
  searchParams,
}: {
  searchParams: Promise<{ envoyee?: string }>;
}) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");
  if (!session.entreprise?.permissions.includes("salaries")) redirect("/client/dashboard");
  const { envoyee } = await searchParams;

  const demandes = await prisma.demandeSalarie.findMany({
    where: { entrepriseId: session.entrepriseId! },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} permissions={session.entreprise?.permissions || []} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10">
          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h1 className="text-3xl font-bold">📝 Mes demandes</h1>
            <p className="text-gray-500 mt-1">Les ajouts et suppressions de salariés, ainsi que les changements de poste et de salaire, sont validés par votre gestionnaire paie avant d&apos;être appliqués. Les autres informations se modifient directement.</p>
          </div>

          {envoyee && (
            <div style={{ background: "#dcfce7", border: "1px solid #86efac", color: "#15803d", borderRadius: "12px", padding: "12px 16px", marginBottom: "16px", fontWeight: 600 }}>
              ✅ Votre demande a bien été envoyée. Vous serez à jour dès sa validation.
            </div>
          )}

          <div className="bg-white rounded-xl shadow p-8">
            {demandes.length === 0 ? (
              <p className="text-gray-500">Aucune demande pour le moment.</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Détail</th>
                    <th className="pb-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {demandes.map((d) => (
                    <tr key={d.id} className="border-b align-top">
                      <td className="py-3 text-sm text-gray-500">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="py-3">{LIBELLES_TYPE[d.type] || d.type}</td>
                      <td className="py-3 text-sm">
                        {d.resume}
                        {d.motifRefus && <span className="text-red-600"> — Motif du refus : {d.motifRefus}</span>}
                      </td>
                      <td className="py-3"><StatutDemande statut={d.statut} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
