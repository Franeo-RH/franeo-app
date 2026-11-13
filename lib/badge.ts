import { prisma } from "@/lib/prisma";
import { repartitionDepuisBadge } from "@/lib/releves-projets";
import { jourUTC } from "@/lib/heures";

export const TYPES_POINTAGE = {
  ARRIVEE: { label: "Arrivée", icone: "🟢" },
  PAUSE: { label: "Début de pause", icone: "☕" },
  REPRISE: { label: "Reprise", icone: "▶️" },
  DEPART: { label: "Départ", icone: "🔴" },
} as const;
export type TypePointage = keyof typeof TYPES_POINTAGE;

/** Actions possibles selon le dernier pointage de la journée */
export function actionsPossibles(dernier: string | null): TypePointage[] {
  if (!dernier || dernier === "DEPART") return ["ARRIVEE"];
  if (dernier === "PAUSE") return ["REPRISE", "DEPART"];
  return ["PAUSE", "DEPART"]; // ARRIVEE ou REPRISE
}

/** Date du jour à Paris (AAAA-MM-JJ) */
export function jourParis(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Distance en mètres entre deux points GPS */
export function distanceM(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000, rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Heures travaillées d'une journée à partir de ses pointages (intervalles ouverts non comptés) */
export function heuresDuJour(pointages: { type: string; at: Date }[]): number {
  let total = 0;
  let debut: Date | null = null;
  for (const p of [...pointages].sort((a, b) => a.at.getTime() - b.at.getTime())) {
    if (p.type === "ARRIVEE" || p.type === "REPRISE") debut = p.at;
    else if ((p.type === "PAUSE" || p.type === "DEPART") && debut) { total += p.at.getTime() - debut.getTime(); debut = null; }
  }
  return Math.round((total / 3600000) * 100) / 100;
}

/**
 * Remplit automatiquement le relevé mensuel du salarié pour ce jour (heures + heures supp. au-delà de la journée type).
 * Le relevé n'est modifié que s'il est encore en brouillon (ou refusé) : un relevé envoyé ou validé n'est jamais touché.
 */
export async function majReleveDepuisPointages(salarieId: string, entrepriseId: string, jour: string) {
  const [annee, mois] = jour.split("-").map(Number);
  const [pointages, salarie] = await Promise.all([
    prisma.pointage.findMany({ where: { salarieId, jour }, select: { salarieId: true, jour: true, type: true, at: true, projetId: true } }),
    prisma.salarie.findUnique({ where: { id: salarieId }, select: { heuresHebdomadaires: true } }),
  ]);
  const heures = heuresDuJour(pointages);
  const journeeType = (salarie?.heuresHebdomadaires || 35) / 5;
  const supp = Math.max(0, Math.round((heures - journeeType) * 100) / 100);
  const date = jourUTC(jour);
  if (!date) return;

  const releve = await prisma.releveMois.upsert({
    where: { salarieId_annee_mois: { salarieId, annee, mois } },
    create: { salarieId, entrepriseId, mois, annee },
    update: {},
  });
  if (releve.statut !== "Brouillon" && releve.statut !== "Refusé") return;
  const existant = await prisma.releveJour.findUnique({ where: { releveId_date: { releveId: releve.id, date } } });
  // Projets choisis au pointage : la journée du relevé est répartie d'après le badge (sauf si le salarié l'a déjà fait)
  const parts = repartitionDepuisBadge(pointages);
  const dejaReparti = existant && Array.isArray(existant.projets) && existant.projets.length > 0;
  const projets = parts.length && !dejaReparti ? { projets: parts } : {};
  if (existant) {
    await prisma.releveJour.update({ where: { id: existant.id }, data: { heures, heuresSupp: supp, ...projets } });
  } else if (heures > 0) {
    await prisma.releveJour.create({ data: { releveId: releve.id, date, heures, heuresSupp: supp, commentaire: "Badge", ...projets } });
  }
}

/** Les pointages sont effacés au bout d'un an (durée de conservation limitée) */
const dernierePurge = new Map<string, number>();
export async function purgerPointages(entrepriseId: string) {
  // Une purge par entreprise et par jour suffit (évite une suppression en base à chaque pointage)
  if ((dernierePurge.get(entrepriseId) ?? 0) > Date.now() - 86400000) return;
  dernierePurge.set(entrepriseId, Date.now());
  const limite = new Date(Date.now() - 366 * 86400000);
  await prisma.pointage.deleteMany({ where: { entrepriseId, at: { lt: limite } } }).catch(() => {});
}
