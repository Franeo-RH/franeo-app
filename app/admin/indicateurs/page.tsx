import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Navbar from "@/components/Navbar";
import IndicateursRH from "@/components/IndicateursRH";

export const dynamic = "force-dynamic";

export default async function AdminIndicateurs() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/indicateurs");
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom={session.prenom} />
      <main className="p-4 md:p-8" style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <IndicateursRH />
      </main>
    </div>
  );
}
