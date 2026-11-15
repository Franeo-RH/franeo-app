// lib/conges-btp.ts
// Congés payés des salariés du BTP (conventions collectives du Bâtiment et des Travaux publics).
// Particularités prises en compte :
//  - les congés sont gérés et payés par la caisse de congés payés du BTP (réseau CIBTP), pas par l'employeur ;
//  - période de référence (acquisition) : du 1er avril au 31 mars ;
//  - acquisition : 2,5 jours ouvrables par mois de travail, un « mois » = 150 heures de travail ; 30 jours ouvrables maximum ;
//  - congés pris (prise du 1er mai au 30 avril suivant) décomptés en jours ouvrables (lundi au samedi, hors jours fériés) ;
//  - arrêt maladie non professionnel : 2 jours ouvrables par mois d'arrêt, dans la limite de 24 jours au total (loi du 22 avril 2024) ;
//  - prime de vacances versée par la caisse : 30 % de l'indemnité des 24 premiers jours, si 1 675 heures de travail sur la période.
// Les autres conventions gardent le solde de congés saisi dans la fiche (pas de calcul automatique pour l'instant).

const JOUR = 86400000;
export const HEURES_PAR_MOIS_BTP = 150;
export const JOURS_PAR_MOIS = 2.5;
export const MAX_JOURS = 30;
export const MAX_AVEC_MALADIE = 24;
export const SEUIL_PRIME_VACANCES = 1675;
export const TAUX_PRIME_VACANCES = 0.3;

// IDCC du BTP : ouvriers du bâtiment (1596, 1597), ETAM (2609), cadres (2420), ouvriers TP (1702), ETAM TP (2614), cadres TP (3212)
const IDCC_BTP = ["1596", "1597", "2609", "2420", "1702", "2614", "3212"];

/** La convention collective est-elle du BTP ? (texte libre ou numéro IDCC) */
export function estBTP(...conventions: (string | null | undefined)[]): boolean {
  return conventions.some((c) => {
    if (!c) return false;
    const t = c.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    return /\bbtp\b|b\.t\.p|batiment|travaux publics/.test(t) || IDCC_BTP.some((n) => new RegExp(`\\b${n}\\b`).test(t));
  });
}

/* ───────── Jours fériés et jours ouvrables ───────── */

function paques(annee: number): Date {
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(annee, mois - 1, jour));
}

const cleJour = (d: Date) => d.toISOString().slice(0, 10);
const cacheFeries = new Map<number, Set<string>>();
export function joursFeries(annee: number): Set<string> {
  if (!cacheFeries.has(annee)) {
    const p = paques(annee).getTime();
    const fixes = ["01-01", "05-01", "05-08", "07-14", "08-15", "11-01", "11-11", "12-25"].map((md) => `${annee}-${md}`);
    const mobiles = [1, 39, 50].map((n) => cleJour(new Date(p + n * JOUR))); // lundi de Pâques, Ascension, lundi de Pentecôte
    cacheFeries.set(annee, new Set([...fixes, ...mobiles]));
  }
  return cacheFeries.get(annee)!;
}

const utc = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** Jours ouvrables (lundi au samedi, hors fériés) entre deux dates incluses */
export function joursOuvrables(du: Date, au: Date): number {
  let n = 0;
  for (let t = utc(du).getTime(); t <= utc(au).getTime(); t += JOUR) {
    const d = new Date(t);
    if (d.getUTCDay() !== 0 && !joursFeries(d.getUTCFullYear()).has(cleJour(d))) n++;
  }
  return n;
}

/** Jours calendaires d'un intervalle compris dans [debut, fin] */
function chevauchement(a: Date, b: Date, debut: Date, fin: Date): number {
  const d = Math.max(utc(a).getTime(), debut.getTime()), f = Math.min(utc(b).getTime(), fin.getTime());
  return f < d ? 0 : Math.round((f - d) / JOUR) + 1;
}

/* ───────── Périodes ───────── */

/** Période d'acquisition BTP contenant la date : du 1er avril au 31 mars */
export function periodeAcquisition(date: Date) {
  const a = date.getUTCMonth() >= 3 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  return { du: new Date(Date.UTC(a, 3, 1)), au: new Date(Date.UTC(a + 1, 2, 31)) };
}

/* ───────── Calcul ───────── */

type Absence = { type: string; statut: string; dateDebut: Date; dateFin: Date };
type Releve = { mois: number; annee: number; statut: string; jours: { heures: number | null; heuresSupp: number }[] };
type SalarieConges = { dateDebut: Date | null; dateFin: Date | null; heuresHebdomadaires: number | null };

const NON_ASSIMILEES = ["CONGE_SANS_SOLDE", "ABSENCE_NON_REMUNEREE"]; // n'ouvrent pas de droits

export type AcquisitionBTP = {
  du: Date; au: Date; heures: number; heuresReleves: number; moisReleves: number; joursMaladie: number;
  acquisTravail: number; acquisMaladie: number; acquis: number; primeVacances: boolean;
};

/** Droits acquis sur une période d'acquisition (jusqu'à `jusquA` si la période est en cours) */
export function acquisitionBTP(s: SalarieConges, absences: Absence[], releves: Releve[], du: Date, au: Date, jusquA = au): AcquisitionBTP {
  const hebdo = s.heuresHebdomadaires && s.heuresHebdomadaires > 0 ? s.heuresHebdomadaires : 35;
  const fin = new Date(Math.min(au.getTime(), utc(jusquA).getTime()));
  const absValidees = absences.filter((a) => a.statut === "Validé");
  let heures = 0, heuresReleves = 0, moisReleves = 0, joursMaladie = 0;

  for (let k = 0; k < 12; k++) {
    const a = du.getUTCFullYear() + Math.floor((du.getUTCMonth() + k) / 12), m = (du.getUTCMonth() + k) % 12;
    const debutMois = new Date(Date.UTC(a, m, 1));
    if (debutMois > fin) break;
    const finMois = new Date(Math.min(Date.UTC(a, m + 1, 0), fin.getTime()));
    // Présence dans l'entreprise ce mois-ci
    const entree = s.dateDebut ? utc(s.dateDebut) : debutMois;
    const sortie = s.dateFin ? utc(s.dateFin) : finMois;
    const presence = chevauchement(entree, sortie, debutMois, finMois);
    if (!presence) continue;
    const maladie = absValidees.filter((x) => x.type === "MALADIE").reduce((t, x) => t + chevauchement(x.dateDebut, x.dateFin, debutMois, finMois), 0);
    joursMaladie += maladie;
    const releve = releves.find((r) => r.annee === a && r.mois === m + 1 && r.statut === "Validé");
    if (releve) {
      const h = releve.jours.reduce((t, j) => t + (j.heures ?? 0) + (j.heuresSupp ?? 0), 0);
      heures += h; heuresReleves += h; moisReleves++;
    } else {
      // Sans relevé validé : horaire contractuel, moins les absences qui n'ouvrent pas de droits (maladie comptée à part)
      const joursMois = Math.round((Date.UTC(a, m + 1, 0) - Date.UTC(a, m, 1)) / JOUR) + 1;
      const theorique = ((hebdo * 52) / 12) * (presence / joursMois);
      const retirees = absValidees.filter((x) => NON_ASSIMILEES.includes(x.type) || x.type === "MALADIE")
        .reduce((t, x) => t + joursOuvrables(new Date(Math.max(utc(x.dateDebut).getTime(), debutMois.getTime())), new Date(Math.min(utc(x.dateFin).getTime(), finMois.getTime()))), 0);
      heures += Math.max(0, theorique - (retirees * hebdo) / 6); // jours ouvrables → heures (6 jours ouvrables par semaine)
    }
  }

  const acquisTravail = (heures / HEURES_PAR_MOIS_BTP) * JOURS_PAR_MOIS;
  const acquisMaladie = (joursMaladie / 30) * 2;
  // Arrondi au jour supérieur (article L3141-7) ; maladie : total plafonné à 24 jours si le travail seul n'en donne pas plus
  const brut = Math.min(MAX_JOURS, Math.ceil(acquisTravail - 1e-9));
  const acquis = acquisMaladie > 0 ? Math.max(brut, Math.min(MAX_AVEC_MALADIE, Math.ceil(acquisTravail + acquisMaladie - 1e-9))) : brut;
  return {
    du, au, heures: Math.round(heures * 10) / 10, heuresReleves: Math.round(heuresReleves * 10) / 10, moisReleves, joursMaladie,
    acquisTravail: Math.round(acquisTravail * 100) / 100, acquisMaladie: Math.round(acquisMaladie * 100) / 100, acquis,
    primeVacances: heures >= SEUIL_PRIME_VACANCES,
  };
}

export type CongesBTP = {
  aPrendre: AcquisitionBTP; // droits acquis sur la période précédente, à prendre du 1er mai au 30 avril
  enCours: AcquisitionBTP; // période d'acquisition en cours
  pris: number; // jours ouvrables de congés payés validés depuis le 1er mai
  enAttente: number; // jours ouvrables de congés payés demandés, pas encore validés
  reste: number;
  priseDu: Date; priseAu: Date;
};

/** Compteur complet d'un salarié BTP à une date */
export function compteurBTP(s: SalarieConges, absences: Absence[], releves: Releve[], aujourdhui = new Date()): CongesBTP {
  const actuelle = periodeAcquisition(aujourdhui);
  const precedente = { du: new Date(Date.UTC(actuelle.du.getUTCFullYear() - 1, 3, 1)), au: new Date(Date.UTC(actuelle.du.getUTCFullYear(), 2, 31)) };
  const aPrendre = acquisitionBTP(s, absences, releves, precedente.du, precedente.au);
  const enCours = acquisitionBTP(s, absences, releves, actuelle.du, actuelle.au, aujourdhui);
  // Les droits acquis au 31 mars se prennent du 1er mai au 30 avril suivant
  const priseDu = new Date(Date.UTC(actuelle.du.getUTCFullYear(), 4, 1));
  const priseAu = new Date(Date.UTC(priseDu.getUTCFullYear() + 1, 3, 30));
  const cp = absences.filter((a) => a.type === "CONGE_PAYE");
  const compte = (statuts: string[]) => cp.filter((a) => statuts.includes(a.statut)).reduce((t, a) => {
    const d = new Date(Math.max(utc(a.dateDebut).getTime(), priseDu.getTime())), f = new Date(Math.min(utc(a.dateFin).getTime(), priseAu.getTime()));
    return f < d ? t : t + joursOuvrables(d, f);
  }, 0);
  const pris = compte(["Validé"]);
  const enAttente = compte(["En attente"]);
  return { aPrendre, enCours, pris, enAttente, reste: Math.max(0, aPrendre.acquis - pris), priseDu, priseAu };
}
