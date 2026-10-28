// Types d'absence que le salarié peut déclarer lui-même. La maladie, la maternité/paternité,
// le congé exceptionnel et l'absence non rémunérée restent saisis par l'employeur ou le gestionnaire.
export const TYPES_ABSENCE_SALARIE: { value: string; label: string }[] = [
  { value: "CONGE_PAYE", label: "Congés payés" },
  { value: "RTT", label: "RTT" },
  { value: "CONGE_SANS_SOLDE", label: "Congé sans solde" },
  { value: "CONGE_NAISSANCE", label: "Congé de naissance" },
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
