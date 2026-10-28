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
