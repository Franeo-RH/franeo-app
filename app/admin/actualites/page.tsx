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
    return `px-3 py-1.5 rounded-full font-semibold text-sm border transition ${
      theme === t ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
    }`;
  }
  const ceMois = toutes.filter((a) => a.createdAt.getMonth() === new Date().getMonth() && a.createdAt.getFullYear() === new Date().getFullYear()).length;
  const derniere = toutes[0]?.createdAt.toLocaleDateString("fr-FR") ?? "—";

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} />
      <div className="flex">
      <Sidebar role="ADMIN" />
      <main className="flex-1 p-6 md:p-10 flex flex-col gap-6" style={{ minWidth: 0 }}>

        <div className="bg-white rounded-xl shadow p-6">
          <h1 className="text-3xl font-bold">📰 Actualité RH</h1>
          <p className="text-gray-500 mt-1">Les actualités sociales publiées ici sont lues par vos clients dans leur onglet Actualités.</p>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          {[
            { n: toutes.length, l: "actualités publiées", i: "📰" },
            { n: ceMois, l: "publiées ce mois-ci", i: "🗓️" },
            { n: derniere, l: "dernière publication", i: "⏱️" },
            { n: THEMATIQUES.filter((t) => toutes.some((a) => a.thematique === t)).length, l: `thématiques sur ${THEMATIQUES.length}`, i: "🏷️" },
          ].map((k) => (
            <div key={k.l} className="bg-white rounded-xl shadow p-4">
              <p className="text-xs font-semibold text-gray-500">{k.i} {k.l}</p>
              <p className="text-2xl font-bold">{k.n}</p>
            </div>
          ))}
        </div>

        <details className="bg-white rounded-xl shadow p-6 group" open={toutes.length === 0}>
          <summary className="text-xl font-bold cursor-pointer list-none flex justify-between items-center">
            <span>✍️ Publier une actualité</span>
            <span className="text-sm font-semibold text-orange-600">Ouvrir / fermer</span>
          </summary>
          <div className="mt-6"><FormulaireActualite /></div>
        </details>

        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/actualites" className={classeOnglet("Toutes")}>
            Toutes ({toutes.length})
          </Link>
          {THEMATIQUES.map((t) => (
            <Link key={t} href={`/admin/actualites?theme=${encodeURIComponent(t)}`} className={classeOnglet(t)}>
              {t} ({toutes.filter((a) => a.thematique === t).length})
            </Link>
          ))}
        </div>

        {actualites.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
            Aucune actualité dans cette thématique.
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))" }}>
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
