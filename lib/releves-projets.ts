// lib/releves-projets.ts
// Option Projets dans le relevé mensuel : le salarié choisit le projet de chaque journée
// (ou répartit ses heures entre plusieurs projets). Ces heures deviennent des « temps passés »
// du projet, sans double compte avec les heures déjà pointées au badge sur le même projet.

import { prisma } from "@/lib/prisma";
import { arrondi, heuresPointeesParJour } from "@/lib/projets";
import { lireHeures } from "@/lib/heures";

export type PartProjet = { projetId: string; heures: number | null };

/** Nettoie la répartition envoyée pour un jour (5 projets au plus) */
export function lireRepartition(v: unknown, autorises: Set<string>): PartProjet[] {
  if (!Array.isArray(v)) return [];
  const vus = new Set<string>();
  const res: PartProjet[] = [];
  for (const x of v.slice(0, 5)) {
    const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
    const id = typeof o.projetId === "string" ? o.projetId : "";
    if (!id || !autorises.has(id) || vus.has(id)) continue;
    vus.add(id);
    const h = typeof o.heures === "number" ? o.heures : lireHeures(o.heures);
    res.push({ projetId: id, heures: h != null && Number.isFinite(h) && h > 0 ? arrondi(Math.min(24, h)) : null });
  }
  return res;
}

/** Heures attribuées à chaque projet pour une journée : les heures vides se partagent le reste de la journée */
export function heuresParProjet(parts: PartProjet[], heuresJour: number | null): { projetId: string; heures: number }[] {
  const fixe = parts.reduce((t, p) => t + (p.heures ?? 0), 0);
  const libres = parts.filter((p) => p.heures == null);
  const reste = Math.max(0, (heuresJour ?? 0) - fixe);
  return parts.map((p) => ({ projetId: p.projetId, heures: arrondi(p.heures ?? (libres.length ? reste / libres.length : 0)) })).filter((p) => p.heures > 0);
}

/** Projets proposés dans le relevé d'un mois : ceux actifs ce mois-là, ceux où le salarié est planifié en premier */
export async function projetsPourReleve(entrepriseId: string, salarieId: string, mois: number, annee: number) {
  const debut = new Date(Date.UTC(annee, mois - 1, 1)), fin = new Date(Date.UTC(annee, mois, 0, 23, 59, 59));
  const projets = await prisma.projet.findMany({
    where: { entrepriseId, statut: { not: "ANNULE" }, dateDebut: { lte: fin }, OR: [{ dateFin: null }, { dateFin: { gte: debut } }] },
    select: { id: true, nom: true, code: true, couleur: true, affectations: { where: { salarieId, du: { lte: fin }, au: { gte: debut } }, select: { id: true } } },
    orderBy: { nom: "asc" },
  });
  return projets
    .map((p) => ({ id: p.id, nom: p.nom, code: p.code, couleur: p.couleur, planifie: p.affectations.length > 0 }))
    .sort((a, b) => Number(b.planifie) - Number(a.planifie) || a.nom.localeCompare(b.nom));
}

/**
 * Recalcule les temps passés issus d'un relevé : supprime les anciens, recrée un temps par projet et par jour.
 * Les heures déjà pointées au badge sur le même projet ce jour-là sont déduites (pas de double compte).
 */
export async function synchroniserTempsReleve(releveId: string) {
  const releve = await prisma.releveMois.findUnique({ where: { id: releveId }, select: { salarieId: true, entrepriseId: true, mois: true, annee: true, jours: { select: { date: true, heures: true, projets: true } } } });
  if (!releve) return;
  const projetsEntreprise = new Set((await prisma.projet.findMany({ where: { entrepriseId: releve.entrepriseId }, select: { id: true } })).map((p) => p.id));
  const prefixe = `${releve.annee}-${String(releve.mois).padStart(2, "0")}`;
  const pointages = await prisma.pointage.findMany({ where: { salarieId: releve.salarieId, jour: { startsWith: prefixe } }, select: { salarieId: true, jour: true, type: true, at: true, projetId: true } });
  const badge = new Map(heuresPointeesParJour(pointages).map((x) => [`${x.projetId}|${x.jour}`, x.heures]));

  const lignes: { projetId: string; salarieId: string; jour: string; heures: number; commentaire: string; releveId: string }[] = [];
  for (const j of releve.jours) {
    const jour = j.date.toISOString().slice(0, 10);
    for (const p of heuresParProjet(lireRepartition(j.projets, projetsEntreprise), j.heures)) {
      const h = arrondi(p.heures - (badge.get(`${p.projetId}|${jour}`) ?? 0));
      if (h > 0) lignes.push({ projetId: p.projetId, salarieId: releve.salarieId, jour, heures: h, commentaire: "Relevé mensuel", releveId });
    }
  }
  await prisma.$transaction([
    prisma.tempsProjet.deleteMany({ where: { releveId } }),
    ...(lignes.length ? [prisma.tempsProjet.createMany({ data: lignes })] : []),
  ]);
}

/** Badge : la répartition par projet d'une journée pointée, d'après les projets choisis au pointage */
export function repartitionDepuisBadge(pointages: { salarieId: string; jour: string; type: string; at: Date; projetId: string | null }[]): PartProjet[] {
  return heuresPointeesParJour(pointages).map((x) => ({ projetId: x.projetId, heures: x.heures }));
}
