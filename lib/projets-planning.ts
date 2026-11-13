// lib/projets-planning.ts
// Planning des projets : retirer en 1 clic les jours d'absence (validée ou en attente) d'une affectation,
// et éventuellement les confier à un remplaçant sur les mêmes jours.

import { prisma } from "@/lib/prisma";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const plus = (j: string, n: number) => { const d = new Date(`${j}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const debutJour = (j: string) => new Date(`${j}T00:00:00Z`);
const finJour = (j: string) => new Date(`${j}T23:59:59Z`);
/** Le segment contient-il au moins un jour ouvré ? */
const ouvre = (du: string, au: string) => { for (let j = du; j <= au; j = plus(j, 1)) { const w = new Date(`${j}T12:00:00Z`).getUTCDay(); if (w !== 0 && w !== 6) return true; } return false; };

/** Retire l'intervalle [a, b] des segments [du, au] (dates AAAA-MM-JJ, bornes incluses) */
function soustraire(segments: [string, string][], a: string, b: string): [string, string][] {
  const res: [string, string][] = [];
  for (const [du, au] of segments) {
    if (b < du || a > au) { res.push([du, au]); continue; }
    if (a > du) res.push([du, plus(a, -1)]);
    if (b < au) res.push([plus(b, 1), au]);
  }
  return res;
}

/**
 * Ajuste les affectations d'un projet pendant les absences des salariés.
 * - affectationId : une seule affectation (sinon toutes celles du projet en conflit) ;
 * - periode : une absence précise (sinon toutes les absences non refusées qui chevauchent) ;
 * - remplacantId : les jours retirés sont confiés à ce salarié, avec le même volume d'heures.
 * Renvoie le nombre de jours ouvrés retirés.
 */
export async function retirerJoursAbsence(projetId: string, opts: { affectationId?: string; periode?: { du: string; au: string }; remplacantId?: string | null } = {}) {
  const affectations = await prisma.affectationProjet.findMany({
    where: { projetId, ...(opts.affectationId ? { id: opts.affectationId } : {}) },
    include: { salarie: { select: { prenom: true, nom: true } } },
  });
  let joursRetires = 0;
  for (const af of affectations) {
    const du = iso(af.du), au = iso(af.au);
    const absences = opts.periode
      ? [{ debut: opts.periode.du, fin: opts.periode.au }]
      : (await prisma.absence.findMany({ where: { salarieId: af.salarieId, statut: { not: "Refusé" }, dateDebut: { lte: finJour(au) }, dateFin: { gte: debutJour(du) } }, select: { dateDebut: true, dateFin: true } }))
          .map((x) => ({ debut: iso(x.dateDebut), fin: iso(x.dateFin) }));
    let segments: [string, string][] = [[du, au]];
    const retires: [string, string][] = [];
    for (const x of absences) {
      const a = x.debut > du ? x.debut : du, b = x.fin < au ? x.fin : au;
      if (a > b) continue;
      retires.push([a, b]);
      segments = soustraire(segments, a, b);
    }
    if (!retires.length) continue;
    for (const [a, b] of retires) for (let j = a; j <= b; j = plus(j, 1)) { const w = new Date(`${j}T12:00:00Z`).getUTCDay(); if (w !== 0 && w !== 6) joursRetires++; }

    await prisma.$transaction([
      prisma.affectationProjet.delete({ where: { id: af.id } }),
      ...segments.filter(([a, b]) => ouvre(a, b)).map(([a, b]) => prisma.affectationProjet.create({ data: { projetId, salarieId: af.salarieId, du: debutJour(a), au: finJour(b), heuresSemaine: af.heuresSemaine, role: af.role } })),
      ...(opts.remplacantId && opts.remplacantId !== af.salarieId
        ? retires.filter(([a, b]) => ouvre(a, b)).map(([a, b]) => prisma.affectationProjet.create({ data: { projetId, salarieId: opts.remplacantId!, du: debutJour(a), au: finJour(b), heuresSemaine: af.heuresSemaine, role: `Remplacement de ${af.salarie.prenom} ${af.salarie.nom}` } }))
        : []),
    ]);
  }
  return joursRetires;
}
