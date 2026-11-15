// lib/conges-serveur.ts
// Compteur de congés d'un salarié, lu en base (BTP : calcul automatique à partir du solde de reprise, voir lib/conges-btp.ts)

import { prisma } from "@/lib/prisma";
import { compteurBTP, estBTP } from "@/lib/conges-btp";

export async function congesSalarie(salarieId: string) {
  const s = await prisma.salarie.findUnique({
    where: { id: salarieId },
    select: {
      dateDebut: true, dateFin: true, heuresHebdomadaires: true, conventionCollective: true, soldeConges: true,
      congesRepriseDate: true, congesRepriseReste: true, congesRepriseEnCours: true,
      entreprise: { select: { ccn: true } },
    },
  });
  if (!s) return null;
  if (!estBTP(s.conventionCollective, s.entreprise.ccn)) return { btp: false as const, soldeSaisi: s.soldeConges };
  const depuis = new Date(Date.UTC(new Date().getUTCFullYear() - 2, 3, 1));
  const [absences, releves] = await Promise.all([
    prisma.absence.findMany({ where: { salarieId, dateFin: { gte: depuis } }, select: { type: true, statut: true, dateDebut: true, dateFin: true } }),
    prisma.releveMois.findMany({ where: { salarieId, annee: { gte: depuis.getUTCFullYear() } }, select: { mois: true, annee: true, statut: true, jours: { select: { date: true, heures: true, heuresSupp: true } } } }),
  ]);
  const reprise = s.congesRepriseDate ? { date: s.congesRepriseDate, reste: s.congesRepriseReste ?? 0, enCours: s.congesRepriseEnCours ?? 0 } : null;
  return { btp: true as const, ...compteurBTP(s, absences, releves, new Date(), reprise) };
}
