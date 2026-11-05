import { prisma } from "@/lib/prisma";

/** Trace une saisie ou une modification de paie (date et heure enregistrées automatiquement) */
export async function journaliser(entrepriseId: string | null | undefined, auteur: string, action: string, detail: string) {
  if (!entrepriseId) return;
  try {
    await prisma.journalPaie.create({ data: { entrepriseId, auteur: auteur.slice(0, 120), action: action.slice(0, 60), detail: detail.slice(0, 500) } });
  } catch {
    // le journal ne doit jamais bloquer une saisie
  }
}
