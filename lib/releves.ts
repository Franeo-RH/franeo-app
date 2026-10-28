import { prisma } from "@/lib/prisma";
import { isoJour, joursDuMois, jourUTC } from "@/lib/heures";

/** Relevé d'un mois + jours saisis + absences du salarié qui tombent dans le mois */
export async function chargerReleve(salarieId: string, mois: number, annee: number) {
  const jours = joursDuMois(mois, annee);
  const debut = new Date(Date.UTC(annee, mois - 1, 1));
  const fin = new Date(Date.UTC(annee, mois, 0, 23, 59, 59));
  const [releve, absences] = await Promise.all([
    prisma.releveMois.findUnique({
      where: { salarieId_annee_mois: { salarieId, annee, mois } },
      include: { jours: { orderBy: { date: "asc" } } },
    }),
    prisma.absence.findMany({
      where: { salarieId, statut: { not: "Refusé" }, dateDebut: { lte: fin }, dateFin: { gte: debut } },
      select: { type: true, dateDebut: true, dateFin: true, statut: true },
    }),
  ]);
  return {
    mois,
    annee,
    premier: jours[0],
    statut: releve?.statut ?? "Brouillon",
    motifRefus: releve?.motifRefus ?? null,
    envoyeAt: releve?.envoyeAt ?? null,
    jours: (releve?.jours ?? []).map((j) => ({ date: isoJour(j.date), heures: j.heures, heuresSupp: j.heuresSupp, commentaire: j.commentaire })),
    absences: absences.map((a) => ({ type: a.type, dateDebut: isoJour(a.dateDebut), dateFin: isoJour(a.dateFin), statut: a.statut })),
  };
}

export function lireMoisAnnee(m: unknown, a: unknown): { mois: number; annee: number } | null {
  const mois = Number(m);
  const annee = Number(a);
  if (!Number.isInteger(mois) || mois < 1 || mois > 12 || !Number.isInteger(annee) || annee < 2020 || annee > 2100) return null;
  return { mois, annee };
}

export { jourUTC };
