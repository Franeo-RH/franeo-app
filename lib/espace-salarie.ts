// Types d'absence que le salarié peut déclarer lui-même (la maladie et la maternité/paternité
// restent saisies par l'employeur ou le gestionnaire).
export const TYPES_ABSENCE_SALARIE: { value: string; label: string }[] = [
  { value: "CONGE_PAYE", label: "Congés payés" },
  { value: "RTT", label: "RTT" },
  { value: "CONGE_SANS_SOLDE", label: "Congé sans solde" },
  { value: "CONGE_EXCEPTIONNEL", label: "Congé exceptionnel (mariage, décès…)" },
  { value: "CONGE_NAISSANCE", label: "Congé de naissance" },
  { value: "ABSENCE_NON_REMUNEREE", label: "Absence non rémunérée" },
];

export const LIBELLES_ABSENCE: Record<string, string> = {
  CONGE_PAYE: "Congés payés",
  RTT: "RTT",
  CONGE_SANS_SOLDE: "Congé sans solde",
  CONGE_EXCEPTIONNEL: "Congé exceptionnel",
  CONGE_NAISSANCE: "Congé de naissance",
  MATERNITE_PATERNITE: "Maternité / Paternité",
  MALADIE: "Arrêt maladie",
  ABSENCE_NON_REMUNEREE: "Absence non rémunérée",
};
