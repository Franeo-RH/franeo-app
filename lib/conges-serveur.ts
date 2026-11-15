// lib/conges-serveur.ts
// Soldes de congés lus en base et calculés (voir lib/conges.ts).
// Chaque salarié part d'un solde de départ : 0 au premier calcul, ou celui saisi / importé dans Gestion RH › Congés.

import { prisma } from "@/lib/prisma";
import { compteurConges, regleConges } from "@/lib/conges";

const SELECT = {
  id: true, prenom: true, nom: true, matricule: true, createdAt: true, dateDebut: true, dateFin: true, heuresHebdomadaires: true, conventionCollective: true, soldeConges: true,
  congesRepriseDate: true, congesRepriseReste: true, congesRepriseEnCours: true, entreprise: { select: { ccn: true } },
} as const;

const aujourdhuiUTC = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); };

/** Compteurs de plusieurs salariés (3 requêtes en tout) */
export async function congesDe(salarieIds: string[]) {
  if (salarieIds.length === 0) return new Map<string, ReturnType<typeof compteurConges> & { salarie: { id: string; prenom: string; nom: string; matricule: string | null } }>();
  const depuis = new Date(Date.UTC(new Date().getUTCFullYear() - 2, 0, 1));
  const [salaries, absences, releves] = await Promise.all([
    prisma.salarie.findMany({ where: { id: { in: salarieIds } }, select: SELECT }),
    prisma.absence.findMany({ where: { salarieId: { in: salarieIds }, dateFin: { gte: depuis } }, select: { salarieId: true, type: true, statut: true, dateDebut: true, dateFin: true } }),
    prisma.releveMois.findMany({ where: { salarieId: { in: salarieIds }, annee: { gte: depuis.getUTCFullYear() } }, select: { salarieId: true, mois: true, annee: true, statut: true, jours: { select: { date: true, heures: true, heuresSupp: true } } } }),
  ]);
  // Salarié sans solde de départ (ajouté depuis) : 0 à la date où il a été créé dans l'application
  for (const s of salaries.filter((x) => !x.congesRepriseDate)) {
    const c = new Date(s.createdAt);
    const date = new Date(Math.min(Date.UTC(c.getUTCFullYear(), c.getUTCMonth(), c.getUTCDate()), aujourdhuiUTC().getTime()));
    await prisma.salarie.updateMany({ where: { id: s.id, congesRepriseDate: null }, data: { congesRepriseDate: date, congesRepriseReste: 0, congesRepriseEnCours: 0 } });
    Object.assign(s, { congesRepriseDate: date, congesRepriseReste: 0, congesRepriseEnCours: 0 });
  }
  const resultat = new Map<string, ReturnType<typeof compteurConges> & { salarie: { id: string; prenom: string; nom: string; matricule: string | null } }>();
  for (const s of salaries) {
    const regle = regleConges(s.conventionCollective, s.entreprise.ccn);
    const reprise = s.congesRepriseDate ? { date: s.congesRepriseDate, reste: s.congesRepriseReste ?? 0, enCours: s.congesRepriseEnCours ?? 0 } : null;
    const c = compteurConges(regle, s, absences.filter((a) => a.salarieId === s.id), releves.filter((r) => r.salarieId === s.id), new Date(), reprise);
    resultat.set(s.id, { ...c, salarie: { id: s.id, prenom: s.prenom, nom: s.nom, matricule: s.matricule } });
    // Le solde affiché ailleurs (indicateurs RH, fiche) suit le calcul
    if (s.soldeConges !== c.reste) await prisma.salarie.update({ where: { id: s.id }, data: { soldeConges: c.reste } }).catch(() => {});
  }
  return resultat;
}

export async function congesSalarie(salarieId: string) {
  return (await congesDe([salarieId])).get(salarieId) ?? null;
}
