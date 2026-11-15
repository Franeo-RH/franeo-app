import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { VisuelMiseAJour } from "@/components/CarteMiseAJour";
import { misesAJour } from "@/lib/communications";

export const dynamic = "force-dynamic";

/** Communication › Mises à jour : l'historique de toutes les nouveautés de l'application */
export default async function MisesAJour() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");
  const liste = await misesAJour("CLIENT");

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} permissions={session.entreprise?.permissions || []} />
      <div className="flex">
        <Sidebar role="CLIENT" />
        <main className="flex-1 p-4 md:p-10 flex flex-col gap-6" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-3xl font-bold">🚀 Mises à jour</h1>
            <p className="text-gray-500 mt-1">Toutes les nouveautés de votre espace Franeo, de la plus récente à la plus ancienne.</p>
          </div>
          {liste.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">Aucune mise à jour pour l&apos;instant.</div>
          ) : (
            liste.map((m, i) => (
              <div key={m.id}>
                {i === 0 && <p className="text-xs font-bold uppercase tracking-wide text-orange-600 mb-2">Dernière mise à jour</p>}
                <VisuelMiseAJour m={m} compact={i > 0} />
              </div>
            ))
          )}
        </main>
      </div>
    </div>
  );
}
