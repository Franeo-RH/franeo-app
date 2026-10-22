import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import ActualitesVue, { type ActuItem } from "@/components/ActualitesVue";
import { THEMATIQUES } from "@/lib/actualites";

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