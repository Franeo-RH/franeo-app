import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ModelesContratsAdmin from "@/components/ModelesContratsAdmin";

export const dynamic = "force-dynamic";

/** Admin › Documentaire › Modèles de contrats FRANEO RH */
export default async function AdminModelesContrats() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-4 md:p-10 flex flex-col gap-6" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-3xl font-bold">📄 Modèles de contrats</h1>
            <p className="text-gray-500 mt-1">Ajoutez ou remplacez les modèles Word proposés à tous les clients. Les modèles de courriers se gèrent dans Modèles de courriers.</p>
          </div>
          <ModelesContratsAdmin />
        </main>
      </div>
    </div>
  );
}
