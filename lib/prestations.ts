// lib/prestations.ts
// Catalogue des prestations à la demande, avec leur prix selon la formule paie du client.
// null = non proposée avec cette formule ; 0 = incluse.
// Les arrivées et sorties ne sont pas ici : elles sont facturées automatiquement d'après les dates
// d'entrée et de sortie des salariés (formules Essentielle et Sérénité).

export type CodeFormule = "ESSENTIELLE" | "SERENITE" | "PREMIUM" | "ENTREPRISE";

export type Prestation = {
  code: string;
  libelle: string;
  description: string;
  unite?: string; // affiché si la quantité a un sens (« salarié », « contrat », « dossier »)
  avecSalarie?: boolean; // propose de choisir le salarié concerné
  prix: Record<CodeFormule, number | null>;
};

export const PRESTATIONS: Prestation[] = [
  {
    code: "RECTIFICATIF", libelle: "Bulletin rectificatif",
    description: "Refaire un bulletin déjà produit (variables transmises en retard ou à corriger).",
    unite: "bulletin", avecSalarie: true,
    prix: { ESSENTIELLE: 15, SERENITE: 15, PREMIUM: 0, ENTREPRISE: 0 },
  },
  {
    code: "ATTESTATION_MALADIE", libelle: "Attestation de salaire maladie / maternité",
    description: "Attestation transmise à la CPAM pour le versement des indemnités journalières.",
    unite: "attestation", avecSalarie: true,
    prix: { ESSENTIELLE: 15, SERENITE: 0, PREMIUM: 0, ENTREPRISE: 0 },
  },
  {
    code: "RELANCE_IJSS", libelle: "Relance et recouvrement des IJSS",
    description: "Relances CPAM et contrôle des indemnités journalières perçues.",
    unite: "dossier", avecSalarie: true,
    prix: { ESSENTIELLE: null, SERENITE: null, PREMIUM: 20, ENTREPRISE: 0 },
  },
  {
    code: "RUPTURE_CONV", libelle: "Rupture conventionnelle",
    description: "Calcul de l'indemnité, préparation du dossier et des documents de fin de contrat.",
    avecSalarie: true,
    prix: { ESSENTIELLE: 120, SERENITE: 120, PREMIUM: 90, ENTREPRISE: 0 },
  },
  {
    code: "CONTROLE_URSSAF", libelle: "Assistance contrôle URSSAF",
    description: "Préparation des pièces et accompagnement pendant un contrôle URSSAF.",
    prix: { ESSENTIELLE: 150, SERENITE: 150, PREMIUM: 150, ENTREPRISE: 0 },
  },
  {
    code: "REPRISE_DOSSIER", libelle: "Reprise du dossier paie",
    description: "Import des salariés, reprise des cumuls et paramétrage du logiciel de paie.",
    unite: "salarié",
    prix: { ESSENTIELLE: 10, SERENITE: 5, PREMIUM: 0, ENTREPRISE: 0 },
  },
  {
    code: "MUTUELLE", libelle: "Paramétrage mutuelle / prévoyance",
    description: "Mise en place d'un contrat de mutuelle ou de prévoyance dans la paie.",
    unite: "contrat",
    prix: { ESSENTIELLE: 50, SERENITE: 50, PREMIUM: 50, ENTREPRISE: 0 },
  },
];

export function prixPrestation(code: string, formule: string | null | undefined): number | null {
  const p = PRESTATIONS.find((x) => x.code === code);
  if (!p || !formule || !(formule in p.prix)) return null;
  return p.prix[formule as CodeFormule];
}

/** Formule la moins chère qui inclut cette prestation (pour le conseil affiché au client) */
export function formuleQuiInclut(code: string): CodeFormule | null {
  const p = PRESTATIONS.find((x) => x.code === code);
  if (!p) return null;
  const ordre: CodeFormule[] = ["ESSENTIELLE", "SERENITE", "PREMIUM", "ENTREPRISE"];
  return ordre.find((f) => p.prix[f] === 0) || null;
}

export const NOMS_FORMULES: Record<CodeFormule, string> = {
  ESSENTIELLE: "Essentielle", SERENITE: "Sérénité", PREMIUM: "Premium", ENTREPRISE: "Entreprise",
};

export const STATUTS_PRESTATION: Record<string, string> = {
  A_FAIRE: "À traiter", FAITE: "Réalisée", ANNULEE: "Annulée",
};
