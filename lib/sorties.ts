// lib/sorties.ts
// Déclaration de sortie d'un salarié (Paie › Déclarer une sortie) : listes partagées navigateur / serveur.

export const MOTIFS_SORTIE: { code: string; label: string; documents?: string }[] = [
  { code: "DEMISSION", label: "Démission" },
  { code: "RUPTURE_CONVENTIONNELLE", label: "Rupture conventionnelle", documents: "convention homologuée (date d'homologation)" },
  { code: "LICENCIEMENT_PERSONNEL", label: "Licenciement pour motif personnel", documents: "lettre de licenciement" },
  { code: "LICENCIEMENT_FAUTE_GRAVE", label: "Licenciement pour faute grave ou lourde", documents: "lettre de licenciement" },
  { code: "LICENCIEMENT_ECONOMIQUE", label: "Licenciement économique", documents: "lettre de licenciement, CSP éventuel" },
  { code: "INAPTITUDE", label: "Licenciement pour inaptitude", documents: "avis d'inaptitude, lettre de licenciement" },
  { code: "FIN_CDD", label: "Fin de CDD" },
  { code: "RUPTURE_PE_EMPLOYEUR", label: "Rupture de la période d'essai (employeur)" },
  { code: "RUPTURE_PE_SALARIE", label: "Rupture de la période d'essai (salarié)" },
  { code: "FIN_APPRENTISSAGE", label: "Fin de contrat d'apprentissage / de professionnalisation" },
  { code: "RETRAITE", label: "Départ volontaire à la retraite" },
  { code: "MISE_RETRAITE", label: "Mise à la retraite" },
  { code: "DECES", label: "Décès" },
  { code: "AUTRE", label: "Autre motif" },
];

export const PREAVIS: Record<string, string> = {
  EFFECTUE: "Préavis effectué",
  DISPENSE_EMPLOYEUR: "Dispensé par l'employeur (préavis payé)",
  NON_EFFECTUE_SALARIE: "Non effectué à la demande du salarié (non payé)",
  SANS: "Pas de préavis",
};

export const libelleMotif = (code: unknown) => MOTIFS_SORTIE.find((m) => m.code === code)?.label ?? String(code ?? "");

/** Documents de fin de contrat préparés par la paie */
export const DOCUMENTS_FIN_CONTRAT = ["Dernier bulletin de paie (solde de tout compte)", "Certificat de travail", "Attestation France Travail", "Reçu pour solde de tout compte"];
