import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accesProjets } from "@/lib/projets-serveur";
import { arrondi, heuresAffectation, joursOuvres, jourISO, lundi } from "@/lib/projets";

/**
 * GET ?du=AAAA-MM-JJ&semaines=8 : plan de charge par salarié et par semaine.
 * Pour chaque semaine : heures planifiées par projet, jours d'absence, capacité (heures du contrat) et taux de charge.
 */
export async function GET(request: NextRequest) {
  const a = await accesProjets();
  if (!a.ok) return a.refus;
  const q = request.nextUrl.searchParams;
  const depart = lundi(/^\d{4}-\d{2}-\d{2}$/.test(q.get("du") || "") ? new Date(q.get("du") + "T00:00:00Z") : new Date());
  const nb = Math.min(26, Math.max(1, Number(q.get("semaines")) || 8));
  const semaines = Array.from({ length: nb }, (_, i) => new Date(depart.getTime() + i * 7 * 86400000));
  const fin = new Date(depart.getTime() + nb * 7 * 86400000 - 1);

  const [salaries, affectations, absences] = await Promise.all([
    prisma.salarie.findMany({ where: { entrepriseId: a.entrepriseId, statut: "Actif" }, select: { id: true, prenom: true, nom: true, poste: true, heuresHebdomadaires: true, service: true }, orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
    prisma.affectationProjet.findMany({
      where: { projet: { entrepriseId: a.entrepriseId, statut: { in: ["PREVU", "EN_COURS"] } }, du: { lte: fin }, au: { gte: depart } },
      include: { projet: { select: { id: true, nom: true, couleur: true, code: true } } },
    }),
    prisma.absence.findMany({ where: { entrepriseId: a.entrepriseId, statut: { not: "Refusé" }, dateDebut: { lte: fin }, dateFin: { gte: depart } }, select: { salarieId: true, dateDebut: true, dateFin: true, type: true, statut: true } }),
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

  return NextResponse.json({ semaines: semaines.map(jourISO), lignes, peutGerer: a.peutGerer });
}
