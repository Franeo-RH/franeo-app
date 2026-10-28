import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import FormulaireActualite from "@/components/FormulaireActualite";
import ActualiteAdminCarte from "@/components/ActualiteAdminCarte";
import { THEMATIQUES } from "@/lib/actualites";

export const dynamic = "force-dynamic";

export default async function AdminActualites({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>;
}) {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/client/dashboard");

  const { theme = "Toutes" } = await searchParams;

  const toutes = await prisma.actualite.findMany({ orderBy: { createdAt: "desc" } });
  const actualites = theme === "Toutes" ? toutes : toutes.filter((a) => a.thematique === theme);

  function classeOnglet(t: string) {
    return `px-4 py-2 rounded-lg font-semibold text-sm transition ${
      theme === t ? "bg-orange-500 text-white" : "bg-white text-gray-500 hover:bg-gray-100"
    }`;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
      <Sidebar role="ADMIN" />
      <main className="flex-1 p-10" style={{ minWidth: 0 }}>

        <div className="bg-white rounded-xl shadow p-8 mb-6">
          <h1 className="text-3xl font-bold">📰 Actualité RH</h1>
          <p className="text-gray-500 mt-1">{toutes.length} actualité(s) publiée(s)</p>
        </div>

        <div className="bg-white rounded-xl shadow p-8 mb-6">
          <h2 className="text-xl font-bold mb-6">➕ Publier une actualité</h2>
          <FormulaireActualite />
        </div>

        <div className="flex gap-2 flex-wrap mb-6">
          <Link href="/admin/actualites" className={classeOnglet("Toutes")}>
            Toutes ({toutes.length})
          </Link>
          {THEMATIQUES.map((t) => (
            <Link
              key={t}
              href={`/admin/actualites?theme=${encodeURIComponent(t)}`}
              className={classeOnglet(t)}
            >
              {t} ({toutes.filter((a) => a.thematique === t).length})
            </Link>
          ))}
        </div>

        {actualites.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
            Aucune actualité dans cette thématique.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {actualites.map((a) => (
              <ActualiteAdminCarte
                key={a.id}
                actualite={{
                  id: a.id,
                  titre: a.titre,
                  contenu: a.contenu,
                  thematique: a.thematique,
                  createdAt: a.createdAt.toISOString(),
                }}
              />
            ))}
          </div>
        )}

      </main>
      </div>
    </div>
  );
}