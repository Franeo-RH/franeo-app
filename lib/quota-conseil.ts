// lib/quota-conseil.ts
// Conseil RH ponctuel (demandes RH simples) : 5 par mois en Basic, 10 en Essentiel, illimité dès Sérénité (RH ou paie).

import { prisma } from "@/lib/prisma";
import { quotaConseil } from "@/lib/droits";

type Entreprise = { id: string; permissions?: string[] | null; abonnement?: { nom: string } | null; abonnementPaie?: { nom: string } | null };

export async function usageConseil(e: Entreprise, maintenant = new Date()) {
  const debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const utilisees = await prisma.questionRH.count({ where: { entrepriseId: e.id, createdAt: { gte: debut } } });
  const quota = quotaConseil(e);
  return { utilisees, quota, restantes: quota === null ? null : Math.max(0, quota - utilisees) };
}
