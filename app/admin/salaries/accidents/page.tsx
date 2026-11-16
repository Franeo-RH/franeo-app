import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import AccidentsTravail from "@/components/AccidentsTravail";

export const dynamic = "force-dynamic";

/** Admin : accidents du travail de tous les clients (utile pour la paie : arrêts, subrogation) */
export default async function AdminAccidents() {
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
            <h1 className="text-3xl font-bold">🩹 Accidents du travail</h1>
            <p className="text-gray-500 mt-1">Tous les accidents déclarés par les salariés ou les clients, avec leur avancement auprès de la CPAM.</p>
          </div>
          <AccidentsTravail admin />
        </main>
      </div>
    </div>
  );
}
