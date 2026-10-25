// lib/masse-salariale.ts
// Suivi global de la paie d'un mois : salaires de base, retenues d'absences,
// variables (heures supp., primes, notes de frais, acomptes), charges et coût employeur.
//
// Règles de calcul (estimation, pas un bulletin de paie) :
// - salaire de base = salaire mensuel saisi dans la fiche salarié ;
// - retenue = salaire / 21,67 × nb de jours ouvrés (lun.–ven.) d'absence dans le mois,
//   pour les congés sans solde, absences non rémunérées et arrêts maladie (absences non refusées) ;
// - heures supp. : taux horaire = salaire / (heures hebdo × 52 / 12), +25 % jusqu'à 8 h, +50 % au-delà ;
// - brut = base − retenues + heures supp. + primes ;
// - charges = brut × taux de charges de l'entreprise (40 % par défaut, réglable dans la fiche entreprise) ;
// - coût employeur = brut + charges + notes de frais (remboursées, sans charges).
//   Les acomptes sont une avance sur salaire : affichés, mais pas ajoutés au coût.

import { prisma } from "@/lib/prisma";

export const JOURS_OUVRES_MOIS = 21.67;
export const TAUX_CHARGES_DEFAUT = 40;

const TYPES_RETENUE_SANS_SOLDE = ["CONGE_SANS_SOLDE", "ABSENCE_NON_REMUNEREE"] as const;
const TYPE_MALADIE = "MALADIE";

export type LigneMasse = {
  salarieId: string;
  salarie: string;
  matricule: string | null;
  entreprise: string;
  poste: string;
  base: number;
  joursSansSolde: number;
  retenueSansSolde: number;
  joursMaladie: number;
  retenueMaladie: number;
  heuresSupp: number;
  heuresSuppBrut: number;
  primes: number;
  notesFrais: number;
  acomptes: number;
  variablesBrut: number; // heures supp. + primes
  brut: number;
  tauxCharges: number;
  charges: number;
  coutTotal: number;
};

export type TotauxMasse = Omit<LigneMasse, "salarieId" | "salarie" | "matricule" | "entreprise" | "poste" | "tauxCharges"> & {
  nbSalaries: number;
  coutVariables: number; // (heures supp. + primes) chargées + notes de frais
};

export type MasseSalariale = { mois: number; annee: number; lignes: LigneMasse[]; totaux: TotauxMasse };

const arrondi = (n: number) => Math.round(n * 100) / 100;

/** Jours ouvrés (lundi → vendredi) d'une absence tombant dans le mois */
function joursOuvresDansMois(debut: Date, fin: Date, mois: number, annee: number): number {
  const d1 = new Date(Math.max(new Date(debut).setHours(0, 0, 0, 0), new Date(annee, mois - 1, 1).getTime()));
  const d2 = new Date(Math.min(new Date(fin).setHours(0, 0, 0, 0), new Date(annee, mois, 0).getTime()));
  let n = 0;
  for (const d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) {
    const j = d.getDay();
    if (j !== 0 && j !== 6) n++;
  }
  return n;
}

function coutHeuresSupp(heures: number, salaireMensuel: number, heuresHebdo: number): number {
  if (!salaireMensuel || heures <= 0) return 0;
  const horaire = salaireMensuel / ((heuresHebdo || 35) * 52 / 12);
  return heures <= 8 ? horaire * heures * 1.25 : horaire * 8 * 1.25 + horaire * (heures - 8) * 1.5;
}

export async function calculerMasseSalariale(options: {
  mois: number;
  annee: number;
  entrepriseId?: string; // une entreprise
  tousLesClients?: boolean; // admin : tous les clients actifs (démo exclue)
}): Promise<MasseSalariale> {
  const { mois, annee } = options;
  const debutMois = new Date(annee, mois - 1, 1);
  const finMois = new Date(annee, mois, 0, 23, 59, 59);

  const filtreEntreprise = options.entrepriseId
    ? { entrepriseId: options.entrepriseId }
    : { entreprise: { demo: false, actif: true } };

  const [salaries, absences, variables] = await Promise.all([
    prisma.salarie.findMany({
      where: {
        ...filtreEntreprise,
        statut: "Actif",
        OR: [{ dateDebut: null }, { dateDebut: { lte: finMois } }],
        AND: [{ OR: [{ dateFin: null }, { dateFin: { gte: debutMois } }] }],
      },
      select: {
        id: true, nom: true, prenom: true, matricule: true, poste: true,
        salaireMensuel: true, heuresHebdomadaires: true,
        entreprise: { select: { nom: true, tauxCharges: true } },
      },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    }),
    prisma.absence.findMany({
      where: {
        ...filtreEntreprise,
        type: { in: [...TYPES_RETENUE_SANS_SOLDE, TYPE_MALADIE] },
        statut: { not: "Refusé" },
        dateDebut: { lte: finMois },
        dateFin: { gte: debutMois },
      },
      select: { salarieId: true, type: true, dateDebut: true, dateFin: true },
    }),
    prisma.variablePaie.findMany({
      where: { ...filtreEntreprise, mois, annee }, // toutes les variables saisies, validées ou non
      select: { salarieId: true, type: true, valeur: true },
    }),
  ]);

  const lignes: LigneMasse[] = salaries.map((s) => {
    const base = s.salaireMensuel || 0;
    const journalier = base / JOURS_OUVRES_MOIS;
    const tauxCharges = s.entreprise.tauxCharges ?? TAUX_CHARGES_DEFAUT;

    let joursSansSolde = 0;
    let joursMaladie = 0;
    for (const a of absences) {
      if (a.salarieId !== s.id) continue;
      const j = joursOuvresDansMois(a.dateDebut, a.dateFin, mois, annee);
      if (a.type === TYPE_MALADIE) joursMaladie += j;
      else joursSansSolde += j;
    }
    const retenueSansSolde = Math.min(journalier * joursSansSolde, base);
    const retenueMaladie = Math.min(journalier * joursMaladie, base - retenueSansSolde);

    let heuresSupp = 0, primes = 0, notesFrais = 0, acomptes = 0;
    for (const v of variables) {
      if (v.salarieId !== s.id) continue;
      if (v.type === "HEURE_SUPPLEMENTAIRE") heuresSupp += v.valeur;
      else if (v.type === "PRIME") primes += v.valeur;
      else if (v.type === "NOTE_FRAIS") notesFrais += v.valeur;
      else if (v.type === "ACOMPTE") acomptes += v.valeur;
    }
    const heuresSuppBrut = coutHeuresSupp(heuresSupp, base, s.heuresHebdomadaires || 35);
    const variablesBrut = heuresSuppBrut + primes;
    const brut = Math.max(base - retenueSansSolde - retenueMaladie + variablesBrut, 0);
    const charges = brut * tauxCharges / 100;

    return {
      salarieId: s.id,
      salarie: `${s.prenom} ${s.nom}`,
      matricule: s.matricule,
      entreprise: s.entreprise.nom,
      poste: s.poste,
      base: arrondi(base),
      joursSansSolde,
      retenueSansSolde: arrondi(retenueSansSolde),
      joursMaladie,
      retenueMaladie: arrondi(retenueMaladie),
      heuresSupp,
      heuresSuppBrut: arrondi(heuresSuppBrut),
      primes: arrondi(primes),
      notesFrais: arrondi(notesFrais),
      acomptes: arrondi(acomptes),
      variablesBrut: arrondi(variablesBrut),
      brut: arrondi(brut),
      tauxCharges,
      charges: arrondi(charges),
      coutTotal: arrondi(brut + charges + notesFrais),
    };
  });

  const somme = (k: keyof LigneMasse) => arrondi(lignes.reduce((acc, l) => acc + (l[k] as number), 0));
  const coutVariables = arrondi(lignes.reduce((acc, l) => acc + l.variablesBrut * (1 + l.tauxCharges / 100) + l.notesFrais, 0));

  return {
    mois,
    annee,
    lignes,
    totaux: {
      nbSalaries: lignes.length,
      base: somme("base"),
      joursSansSolde: somme("joursSansSolde"),
      retenueSansSolde: somme("retenueSansSolde"),
      joursMaladie: somme("joursMaladie"),
      retenueMaladie: somme("retenueMaladie"),
      heuresSupp: somme("heuresSupp"),
      heuresSuppBrut: somme("heuresSuppBrut"),
      primes: somme("primes"),
      notesFrais: somme("notesFrais"),
      acomptes: somme("acomptes"),
      variablesBrut: somme("variablesBrut"),
      brut: somme("brut"),
      charges: somme("charges"),
      coutTotal: somme("coutTotal"),
      coutVariables,
    },
  };
}
