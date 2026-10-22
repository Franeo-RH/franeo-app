import { prisma } from "@/lib/prisma";

export function nettoyerMatricule(valeur: unknown): string | null {
  if (typeof valeur !== "string") return null;
  const m = valeur.trim().replace(/\s+/g, " ");
  return m.length > 0 ? m.slice(0, 30) : null;
}

/** Renvoie le salarié qui porte déjà ce matricule dans l'entreprise (sans tenir compte des majuscules) */
export async function matriculeDejaPris(entrepriseId: string, matricule: string, sauf?: string) {
  return prisma.salarie.findFirst({
    where: {
      entrepriseId,
      matricule: { equals: matricule, mode: "insensitive" },
      ...(sauf ? { id: { not: sauf } } : {}),
    },
    select: { id: true, prenom: true, nom: true },
  });
}