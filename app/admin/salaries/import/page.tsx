import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ImportSalaries from "@/components/ImportSalaries";

export const dynamic = "force-dynamic";

export default async function AdminImportSalaries() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");
  const entreprises = await prisma.entreprise.findMany({ where: { demo: false }, select: { id: true, nom: true }, orderBy: { nom: "asc" } });
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom={session.prenom} />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1" style={{ minWidth: 0 }}>
          <ImportSalaries entreprises={entreprises} />
        </main>
      </div>
    </div>
  );
}
