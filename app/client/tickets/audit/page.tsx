import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import DemandesServices from "@/components/DemandesServices";
import { estAbonne } from "@/lib/apps-franeo";

export const dynamic = "force-dynamic";

export default async function PageAudit() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="CLIENT" prenom={session.prenom} permissions={session.entreprise?.permissions || []} />
      <div className="flex">
        <Sidebar role="CLIENT" />
        <main className="flex-1 p-4 md:p-10" style={{ minWidth: 0 }}>
          <DemandesServices abonne={estAbonne(session.entreprise)} seul="AUDIT" />
        </main>
      </div>
    </div>
  );
}
