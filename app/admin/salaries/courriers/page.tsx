import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Courriers from "@/components/Courriers";

export const dynamic = "force-dynamic";

/** Admin : modèles de courriers proposés à tous les clients (en plus de ceux fournis avec l'application) */
export default async function AdminCourriers() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom={session.prenom} />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-4 md:p-10 flex flex-col gap-6" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-3xl font-bold">✉️ Modèles de courriers</h1>
            <p className="text-gray-500 mt-1">Les modèles que vous ajoutez ici sont proposés à tous vos clients (Gestion RH › Courriers & modèles), en plus des modèles fournis avec l&apos;application. Chaque client peut aussi créer les siens.</p>
          </div>
          <Courriers />
        </main>
      </div>
    </div>
  );
}
