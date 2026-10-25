import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import ActualitesVue, { type ActuItem } from "@/components/ActualitesVue";
import { THEMATIQUES } from "@/lib/actualites";
import { estSessionDemo } from "@/lib/demo";

export const dynamic = "force-dynamic";

function formaterDate(d: Date) {
  return new Date(d).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
}

function formaterMois(d: Date) {
  return new Date(d).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "Europe/Paris" });
}

function versItem(a: { id: string; titre: string; contenu: string; thematique: string; createdAt: Date }): ActuItem {
  return {
    id: a.id,
    titre: a.titre,
    contenu: a.contenu,
    thematique: a.thematique,
    date: formaterDate(a.createdAt),
    mois: formaterMois(a.createdAt),
  };
}

export default async function ClientActualites({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>;
}) {
  await connection();

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CLIENT") redirect("/admin/dashboard");

  const { theme } = await searchParams;

  // Nombre d'actualités par thématique
  const groupes = await prisma.actualite.groupBy({
    by: ["thematique"],
    _count: { _all: true },
  });
  const comptes = new Map<string, number>(groupes.map((g) => [g.thematique, g._count._all]));

  // Seules les thématiques qui ont au moins une actualité
  const tuiles = THEMATIQUES.filter((t) => (comptes.get(t) || 0) > 0).map((t) => ({
    nom: t,
    total: comptes.get(t) || 0,
  }));

  // Démo : on montre les thèmes, mais aucun contenu n'est consultable
  const demo = estSessionDemo(session);
  if (demo) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar role={session.role} prenom={session.prenom} permissions={session.entreprise?.permissions || []} />
        <main className="p-10 max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow p-8 mb-8">
            <h1 className="text-3xl font-bold">📰 Actualité RH</h1>
            <p className="text-gray-500 mt-1">Les dernières informations RH, paie et réglementation</p>
          </div>
          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", borderRadius: "12px", padding: "14px 18px", marginBottom: "20px", fontWeight: 600 }}>
            🔒 Les articles ne sont pas consultables dans la version démo. Voici les thèmes suivis par nos experts.
          </div>
          <div className="fr-grille-tuiles" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
            {(tuiles.length > 0 ? tuiles : THEMATIQUES.map((t) => ({ nom: t, total: 0 }))).map((t) => (
              <div key={t.nom} aria-disabled="true" style={{ background: "#ffffff", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", padding: "20px", opacity: 0.85, cursor: "not-allowed" }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "16px" }}>{t.nom}</p>
                <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: "13px" }}>
                  {t.total > 0 ? `${t.total} article(s)` : "Articles réguliers"} · 🔒 non disponible en démo
                </p>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  const themeValide = theme && tuiles.some((t) => t.nom === theme) ? theme : null;

  let une: ActuItem | null = null;
  let items: ActuItem[] = [];

  if (themeValide) {
    const lignes = await prisma.actualite.findMany({
      where: { thematique: themeValide },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    items = lignes.map(versItem);
  } else {
    const derniere = await prisma.actualite.findFirst({ orderBy: { createdAt: "desc" } });
    une = derniere ? versItem(derniere) : null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role={session.role} prenom={session.prenom} permissions={session.entreprise?.permissions || []} />
      <main className="p-10 max-w-6xl mx-auto">

        <div className="bg-white rounded-xl shadow p-8 mb-8">
          <h1 className="text-3xl font-bold">📰 Actualité RH</h1>
          <p className="text-gray-500 mt-1">Les dernières informations RH, paie et réglementation</p>
        </div>

        <ActualitesVue
          key={themeValide ?? "accueil"}
          vue={themeValide ? "theme" : "accueil"}
          theme={themeValide ?? undefined}
          tuiles={tuiles}
          une={une}
          items={items}
          total={themeValide ? comptes.get(themeValide) || 0 : 0}
        />

      </main>
    </div>
  );
}