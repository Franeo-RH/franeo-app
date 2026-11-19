import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import NouveauCabinet from "@/components/cabinet/NouveauCabinet";
import { tarifCabinet, euros } from "@/lib/cabinet";

export const dynamic = "force-dynamic";

export default async function AdminCabinets() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const cabinets = await prisma.cabinet.findMany({
    orderBy: [{ demo: "asc" }, { nom: "asc" }],
    include: { _count: { select: { entreprises: { where: { actif: true } }, utilisateurs: true } } },
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
        <Sidebar role={session.role} />
        <main className="flex-1 p-10 flex flex-col gap-6">
          <div className="bg-white rounded-xl shadow p-8">
            <h1 className="text-3xl font-bold">🏛️ Cabinets comptables</h1>
            <p className="text-gray-500 mt-1">Un accès pour tous les clients d&apos;un cabinet, des droits par collaborateur et un tarif sur mesure.</p>
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {cabinets.length === 0 && <p className="text-gray-500">Aucun cabinet pour le moment.</p>}
            {cabinets.map((c) => {
              const t = tarifCabinet(c, c._count.entreprises);
              return (
                <Link key={c.id} href={`/admin/entreprises/cabinets/${c.id}`} className="fr-verre p-5 flex flex-col gap-2 hover:-translate-y-0.5 transition">
                  <div className="flex justify-between items-start gap-2">
                    <h2 className="text-lg font-bold">{c.nom}</h2>
                    {c.demo ? <span className="fr-puce">Démo</span> : !c.actif ? <span className="fr-puce" style={{ color: "#b91c1c" }}>Suspendu</span> : null}
                  </div>
                  <p className="text-sm text-gray-500">{c.ville || "—"}</p>
                  <p className="text-sm">🗂️ {c._count.entreprises} client{c._count.entreprises > 1 ? "s" : ""} · 👥 {c._count.utilisateurs} accès</p>
                  <p className="text-sm font-semibold text-orange-600">{t.defini ? `${euros(t.total)} / mois` : "Tarif à définir"}</p>
                </Link>
              );
            })}
          </div>

          <NouveauCabinet />
        </main>
      </div>
    </div>
  );
}
