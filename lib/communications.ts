import { prisma } from "@/lib/prisma";

export { CIBLES } from "@/lib/communications-cibles";

/** Communications pas encore validées (« J'ai lu ») par cet utilisateur */
export async function communicationsNonLues(u: { id: string; role: string; entrepriseId: string | null }) {
  if (!u.entrepriseId || (u.role !== "CLIENT" && u.role !== "SALARIE")) return [];
  const cibles = u.role === "CLIENT" ? ["CLIENTS", "TOUS"] : ["SALARIES", "TOUS"];
  return prisma.communication.findMany({
    where: {
      cible: { in: cibles },
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
    where: { cible: { in: cibles }, OR: [{ entrepriseId: null }, { entrepriseId: u.entrepriseId }] },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, titre: true, contenu: true, importante: true, createdAt: true, lectures: { where: { utilisateurId: u.id }, select: { luAt: true } } },
  });
  return coms.map(({ lectures, ...c }) => ({ ...c, luAt: lectures[0]?.luAt ?? null }));
}
