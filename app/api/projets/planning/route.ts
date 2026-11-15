import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accesProjets } from "@/lib/projets-serveur";
import { arrondi, heuresAffectation, joursOuvres, jourISO, lundi } from "@/lib/projets";
import { joursFeries } from "@/lib/conges";

type Acces = Extract<Awaited<ReturnType<typeof accesProjets>>, { ok: true }>;
const cle = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Vue mensuelle (?mois=AAAA-MM) : pour chaque salarié, les jours planifiés de chaque projet,
 * ses jours d'absence, et sa charge du mois (heures planifiées / heures disponibles).
 * Les week-ends et jours fériés ne sont ni planifiés ni comptés dans la capacité.
 */
async function planningMois(a: Acces, mois: string) {
  const [an, m] = mois.split("-").map(Number);
  const debut = new Date(Date.UTC(an, m - 1, 1));
  const fin = new Date(Date.UTC(an, m, 0, 23, 59, 59));
  const nbJours = new Date(Date.UTC(an, m, 0)).getUTCDate();
  const feries = joursFeries(an);
  const jours = Array.from({ length: nbJours }, (_, i) => {
    const d = new Date(Date.UTC(an, m - 1, i + 1));
    const w = d.getUTCDay();
    const date = cle(d);
    return { date, weekend: w === 0 || w === 6, ferie: feries.has(date) };
  });
  const ouvre = (j: { weekend: boolean; ferie: boolean }) => !j.weekend && !j.ferie;

  const [salaries, affectations, absences] = await Promise.all([
    prisma.salarie.findMany({ where: { entrepriseId: a.entrepriseId, statut: "Actif", ...a.fs }, select: { id: true, prenom: true, nom: true, poste: true, heuresHebdomadaires: true, service: true }, orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
    prisma.affectationProjet.findMany({
      where: { projet: { entrepriseId: a.entrepriseId, ...a.fp, statut: { in: ["PREVU", "EN_COURS"] } }, du: { lte: fin }, au: { gte: debut } },
      include: { projet: { select: { id: true, nom: true, couleur: true, code: true } } },
    }),
    prisma.absence.findMany({ where: { entrepriseId: a.entrepriseId, ...a.fv, statut: { not: "Refusé" }, dateDebut: { lte: fin }, dateFin: { gte: debut } }, select: { salarieId: true, dateDebut: true, dateFin: true, type: true, statut: true } }),
  ]);

  const projets = new Map<string, { id: string; nom: string; code: string | null; couleur: string }>();
  for (const af of affectations) projets.set(af.projet.id, af.projet);
  const dansJour = (du: Date, au: Date, date: string) => cle(du) <= date && cle(au) >= date;

  const lignes = salaries.map((s) => {
    const capaciteSemaine = s.heuresHebdomadaires && s.heuresHebdomadaires > 0 ? s.heuresHebdomadaires : 35;
    const abs = absences.filter((x) => x.salarieId === s.id);
    const absence = jours.map((j) => {
      const x = ouvre(j) ? abs.find((y) => dansJour(y.dateDebut, y.dateFin, j.date)) : undefined;
      return x ? { type: x.type, enAttente: x.statut !== "Validé" } : null;
    });
    // Un projet peut avoir plusieurs affectations pour la même personne : heures additionnées par jour
    const parProjet = new Map<string, number[]>();
    for (const af of affectations.filter((x) => x.salarieId === s.id)) {
      const h = parProjet.get(af.projet.id) ?? jours.map(() => 0);
      jours.forEach((j, i) => { if (ouvre(j) && dansJour(af.du, af.au, j.date)) h[i] = arrondi(h[i] + af.heuresSemaine / 5); });
      parProjet.set(af.projet.id, h);
    }
    const lignesProjets = [...parProjet.entries()].filter(([, h]) => h.some((x) => x > 0)).map(([projetId, heures]) => ({ projetId, heures }));
    const joursDispo = jours.filter((j, i) => ouvre(j) && !absence[i]).length;
    const capacite = arrondi((capaciteSemaine / 5) * joursDispo);
    const planifie = arrondi(lignesProjets.reduce((t, p) => t + p.heures.reduce((u, x) => u + x, 0), 0));
    const conflits = jours.filter((_, i) => absence[i] && lignesProjets.some((p) => p.heures[i] > 0)).length;
    return {
      salarieId: s.id, salarie: `${s.prenom} ${s.nom}`, poste: s.poste, service: s.service, capaciteSemaine,
      projets: lignesProjets, absence, capacite, planifie, conflits,
      charge: capacite > 0 ? Math.round((planifie / capacite) * 100) : planifie > 0 ? 999 : 0,
    };
  });

  const noms = new Map(salaries.map((s) => [s.id, `${s.prenom} ${s.nom}`]));
  const conflits = affectations.flatMap((af) => absences
    .filter((ab) => ab.salarieId === af.salarieId && ab.dateDebut <= af.au && ab.dateFin >= af.du && ab.dateDebut <= fin && ab.dateFin >= debut)
    .map((ab) => ({ projetId: af.projet.id, projet: af.projet.nom, affectationId: af.id, salarieId: af.salarieId, salarie: noms.get(af.salarieId) ?? "Salarié", du: jourISO(ab.dateDebut > af.du ? ab.dateDebut : af.du), au: jourISO(ab.dateFin < af.au ? ab.dateFin : af.au), type: ab.type, statut: ab.statut })));

  return { mois, jours, projets: [...projets.values()], lignes, conflits, peutGerer: a.peutGerer };
}

/**
 * GET ?mois=AAAA-MM : vue du mois (page Planning).
 * GET ?du=AAAA-MM-JJ&semaines=8 : plan de charge par salarié et par semaine.
 * Pour chaque semaine : heures planifiées par projet, jours d'absence, capacité (heures du contrat) et taux de charge.
 */
export async function GET(request: NextRequest) {
  const a = await accesProjets();
  if (!a.ok) return a.refus;
  const q = request.nextUrl.searchParams;
  const mois = q.get("mois") || "";
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(mois)) return NextResponse.json(await planningMois(a, mois));
  const depart = lundi(/^\d{4}-\d{2}-\d{2}$/.test(q.get("du") || "") ? new Date(q.get("du") + "T00:00:00Z") : new Date());
  const nb = Math.min(26, Math.max(1, Number(q.get("semaines")) || 8));
  const semaines = Array.from({ length: nb }, (_, i) => new Date(depart.getTime() + i * 7 * 86400000));
  const fin = new Date(depart.getTime() + nb * 7 * 86400000 - 1);

  const [salaries, affectations, absences] = await Promise.all([
    prisma.salarie.findMany({ where: { entrepriseId: a.entrepriseId, statut: "Actif", ...a.fs }, select: { id: true, prenom: true, nom: true, poste: true, heuresHebdomadaires: true, service: true }, orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
    prisma.affectationProjet.findMany({
      where: { projet: { entrepriseId: a.entrepriseId, ...a.fp, statut: { in: ["PREVU", "EN_COURS"] } }, du: { lte: fin }, au: { gte: depart } },
      include: { projet: { select: { id: true, nom: true, couleur: true, code: true } } },
    }),
    prisma.absence.findMany({ where: { entrepriseId: a.entrepriseId, ...a.fv, statut: { not: "Refusé" }, dateDebut: { lte: fin }, dateFin: { gte: depart } }, select: { salarieId: true, dateDebut: true, dateFin: true, type: true, statut: true } }),
  ]);

  const lignes = salaries.map((s) => {
    const capaciteSemaine = s.heuresHebdomadaires && s.heuresHebdomadaires > 0 ? s.heuresHebdomadaires : 35;
    const cases = semaines.map((l) => {
      const v = new Date(l.getTime() + 4 * 86400000 + 86399000); // vendredi soir
      const projets = affectations.filter((x) => x.salarieId === s.id)
        .map((x) => ({ projetId: x.projet.id, nom: x.projet.nom, code: x.projet.code, couleur: x.projet.couleur, heures: heuresAffectation(x, l, v), affectationId: x.id }))
        .filter((x) => x.heures > 0);
      let joursAbsence = 0;
      const abs = absences.filter((x) => x.salarieId === s.id && x.dateDebut <= v && x.dateFin >= l);
      for (const x of abs) joursAbsence += joursOuvres(x.dateDebut > l ? x.dateDebut : l, x.dateFin < v ? x.dateFin : v);
      joursAbsence = Math.min(5, joursAbsence);
      const capacite = arrondi((capaciteSemaine * (5 - joursAbsence)) / 5);
      const planifie = arrondi(projets.reduce((t, x) => t + x.heures, 0));
      return {
        semaine: jourISO(l), projets, joursAbsence, absences: abs.map((x) => x.type), capacite, planifie,
        charge: capacite > 0 ? Math.round((planifie / capacite) * 100) : planifie > 0 ? 999 : 0,
        conflit: joursAbsence > 0 && projets.length > 0,
      };
    });
    return { salarieId: s.id, salarie: `${s.prenom} ${s.nom}`, poste: s.poste, service: s.service, capaciteSemaine, cases };
  });

  // Absences (validées ou en attente) pendant une affectation de la période : à ajuster en 1 clic
  const noms = new Map(salaries.map((s) => [s.id, `${s.prenom} ${s.nom}`]));
  const conflits = affectations.flatMap((af) => absences
    .filter((ab) => ab.salarieId === af.salarieId && ab.dateDebut <= af.au && ab.dateFin >= af.du)
    .map((ab) => ({ projetId: af.projet.id, projet: af.projet.nom, affectationId: af.id, salarieId: af.salarieId, salarie: noms.get(af.salarieId) ?? "Salarié", du: jourISO(ab.dateDebut > af.du ? ab.dateDebut : af.du), au: jourISO(ab.dateFin < af.au ? ab.dateFin : af.au), type: ab.type, statut: ab.statut })));

  return NextResponse.json({ semaines: semaines.map(jourISO), lignes, conflits, peutGerer: a.peutGerer });
}
