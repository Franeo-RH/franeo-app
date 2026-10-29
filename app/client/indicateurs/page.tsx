import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Navbar from "@/components/Navbar";
import IndicateursRH from "@/components/IndicateursRH";
import { VIEW_HR_INDICATORS } from "@/lib/indicateurs-calculs";

export const dynamic = "force-dynamic";

export default async function ClientIndicateurs() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/indicateurs");
  const permissions = session.entreprise?.permissions || [];
  // Permission VIEW_HR_INDICATORS (module « Indicateurs RH » coché par l'admin)
  if (!permissions.includes(VIEW_HR_INDICATORS)) redirect("/client/dashboard");
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="CLIENT" prenom={session.prenom} permissions={permissions} />
      <main className="p-4 md:p-8" style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <IndicateursRH />
      </main>
    </div>
  );
}
