import { prisma } from "@/lib/prisma";
import { accesChoisi, niveauRH, permissionsFormule } from "@/lib/droits";

/**
 * Après un changement de formule : les accès suivent la nouvelle formule,
 * sauf si l'admin a choisi un « accès personnalisé » pour ce client.
 */
export async function ajusterAccesFormule(entrepriseId: string) {
  const e = await prisma.entreprise.findUnique({ where: { id: entrepriseId }, include: { abonnement: { select: { nom: true } } } });
  if (!e || e.demo || accesChoisi(e.permissions) === "PERSO") return;
  const niveau = ["", "BASIC", "ESSENTIEL", "SERENITE", "PREMIUM"][niveauRH(e)] || "BASIC";
  await prisma.entreprise.update({ where: { id: e.id }, data: { permissions: permissionsFormule(niveau, e.permissions, !!e.abonnementPaieId) } });
}
