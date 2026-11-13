import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionSalarie } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { arrondi, heuresAffectation, heuresDatees, jourISO, lundi } from "@/lib/projets";

/** GET : mes projets (option Projets) : planning des 6 prochaines semaines et mes heures du mois par projet */
export async function GET() {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  if (!aDroit(s.utilisateur.entreprise?.permissions, "espace.projets")) return NextResponse.json({ erreur: "Option non activée" }, { status: 403 });
  const l0 = lundi(new Date());
  const fin = new Date(l0.getTime() + 6 * 7 * 86400000 - 1);
  const affectations = await prisma.affectationProjet.findMany({
    where: { salarieId: s.salarie.id, du: { lte: fin }, au: { gte: l0 }, projet: { statut: { in: ["PREVU", "EN_COURS"] } } },
    include: { projet: { select: { id: true, nom: true, code: true, couleur: true, client: true, responsable: { select: { prenom: true, nom: true } } } } },
  });
  const semaines = Array.from({ length: 6 }, (_, k) => {
    const l = new Date(l0.getTime() + k * 7 * 86400000), v = new Date(l.getTime() + 4 * 86400000 + 86399000);
    return { semaine: jourISO(l), projets: affectations.map((a) => ({ nom: a.projet.nom, couleur: a.projet.couleur, heures: heuresAffectation(a, l, v) })).filter((x) => x.heures > 0) };
  });
  const mois = new Date().toISOString().slice(0, 7);
  const ids = [...new Set(affectations.map((a) => a.projetId))];
  const mesHeures = (await heuresDatees(ids)).filter((h) => h.salarieId === s.salarie.id && h.jour.startsWith(mois));
  const projets = [...new Map(affectations.map((a) => [a.projet.id, a])).values()].map((a) => ({
    id: a.projet.id, nom: a.projet.nom, code: a.projet.code, couleur: a.projet.couleur, client: a.projet.client, role: a.role,
    responsable: a.projet.responsable ? `${a.projet.responsable.prenom} ${a.projet.responsable.nom}` : null,
    heuresMois: arrondi(mesHeures.filter((h) => h.projetId === a.projet.id).reduce((t, h) => t + h.heures, 0), 1),
  }));
  // Planning prévisionnel de la semaine en cours, jour par jour (du lundi au vendredi), avec les absences
  const vendredi = new Date(l0.getTime() + 4 * 86400000 + 86399000);
  const absences = await prisma.absence.findMany({
    where: { salarieId: s.salarie.id, statut: { not: "Refusé" }, dateDebut: { lte: vendredi }, dateFin: { gte: l0 } },
    select: { type: true, statut: true, dateDebut: true, dateFin: true },
  });
  const semaine = Array.from({ length: 5 }, (_, k) => {
    const j = new Date(l0.getTime() + k * 86400000), iso = jourISO(j);
    const abs = absences.find((x) => jourISO(x.dateDebut) <= iso && iso <= jourISO(x.dateFin));
    return {
      jour: iso,
      absence: abs ? { type: abs.type, enAttente: /attente/i.test(abs.statut) } : null,
      projets: affectations
        .filter((a) => jourISO(a.du) <= iso && iso <= jourISO(a.au))
        .map((a) => ({ nom: a.projet.nom, code: a.projet.code, couleur: a.projet.couleur, heures: arrondi(a.heuresSemaine / 5, 1), role: a.role })),
    };
  });

  return NextResponse.json({ projets, semaines, semaine });
}
