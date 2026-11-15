import { prisma } from "@/lib/prisma";

import { contenuMiseAJour, MISES_A_JOUR, titreMiseAJour, type CibleMiseAJour } from "@/lib/nouveautes";

export { CIBLES } from "@/lib/communications-cibles";

let nouveautesPubliees = false;
/** Publie une seule fois chaque mise à jour de lib/nouveautes.ts (clients et salariés), de la plus ancienne à la plus récente */
async function publierNouveautes() {
  if (nouveautesPubliees) return;
  try {
    // Anciennes communications « Nouveautés » (avant l'onglet Mises à jour) : remplacées par l'historique
    await prisma.communication.deleteMany({ where: { titre: { startsWith: "🚀 Nouveautés" }, type: "INFO" } });
    for (const m of [...MISES_A_JOUR].reverse()) {
      for (const cible of ["CLIENTS", "SALARIES"] as CibleMiseAJour[]) {
        if (cible === "SALARIES" && !m.salaries?.length) continue;
        const titre = titreMiseAJour(m, cible);
        const existe = await prisma.communication.findFirst({ where: { titre, cible, type: "MISE_A_JOUR" }, select: { id: true } });
        if (!existe) await prisma.communication.create({ data: { titre, contenu: contenuMiseAJour(m, cible), cible, type: "MISE_A_JOUR", importante: false } });
      }
    }
    nouveautesPubliees = true;
  } catch (e) {
    console.error("Mises à jour non publiées :", e);
  }
}

const ciblesDe = (role: string) => (role === "CLIENT" ? ["CLIENTS", "TOUS"] : ["SALARIES", "TOUS"]);

/** Dernière mise à jour de l'application, si cet utilisateur ne l'a pas encore lue (une seule : la plus récente) */
export async function derniereMiseAJour(u: { id: string; role: string; entrepriseId: string | null }) {
  if (!u.entrepriseId || (u.role !== "CLIENT" && u.role !== "SALARIE")) return null;
  await publierNouveautes();
  const derniere = await prisma.communication.findFirst({
    where: { type: "MISE_A_JOUR", cible: { in: ciblesDe(u.role) } },
    orderBy: { createdAt: "desc" },
    select: { id: true, titre: true, contenu: true, createdAt: true, lectures: { where: { utilisateurId: u.id }, select: { id: true } } },
  });
  if (!derniere || derniere.lectures.length) return null;
  const { lectures: _l, ...c } = derniere;
  void _l;
  return c;
}

/** Historique de toutes les mises à jour (Communication › Mises à jour) */
export async function misesAJour(role: string) {
  await publierNouveautes();
  return prisma.communication.findMany({
    where: { type: "MISE_A_JOUR", cible: { in: ciblesDe(role) } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, titre: true, contenu: true, createdAt: true },
  });
}

/** Communications pas encore validées (« J'ai lu ») par cet utilisateur */
export async function communicationsNonLues(u: { id: string; role: string; entrepriseId: string | null }) {
  if (!u.entrepriseId || (u.role !== "CLIENT" && u.role !== "SALARIE")) return [];
  await publierNouveautes();
  const cibles = u.role === "CLIENT" ? ["CLIENTS", "TOUS"] : ["SALARIES", "TOUS"];
  return prisma.communication.findMany({
    where: {
      cible: { in: cibles },
      type: { not: "MISE_A_JOUR" }, // la dernière mise à jour a sa propre carte
      OR: [{ entrepriseId: null }, { entrepriseId: u.entrepriseId }],
      lectures: { none: { utilisateurId: u.id } },
    },
    orderBy: [{ importante: "desc" }, { createdAt: "desc" }],
    take: 5,
    select: { id: true, titre: true, contenu: true, importante: true, createdAt: true },
  });
}

/** Toutes les communications adressées à cet utilisateur (lues ou non), pour l'onglet Actualité */
export async function communicationsRecues(u: { id: string; role: string; entrepriseId: string | null }) {
  if (!u.entrepriseId || (u.role !== "CLIENT" && u.role !== "SALARIE")) return [];
  const cibles = u.role === "CLIENT" ? ["CLIENTS", "TOUS"] : ["SALARIES", "TOUS"];
  const coms = await prisma.communication.findMany({
    where: { cible: { in: cibles }, type: { not: "MISE_A_JOUR" }, OR: [{ entrepriseId: null }, { entrepriseId: u.entrepriseId }] },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, titre: true, contenu: true, importante: true, createdAt: true, lectures: { where: { utilisateurId: u.id }, select: { luAt: true } } },
  });
  return coms.map(({ lectures, ...c }) => ({ ...c, luAt: lectures[0]?.luAt ?? null }));
}
