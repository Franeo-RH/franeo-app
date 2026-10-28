// Destinataires possibles d'une communication (utilisable côté navigateur)
export const CIBLES = [
  { value: "CLIENTS", label: "Clients (employeurs)" },
  { value: "SALARIES", label: "Salariés (espace salarié)" },
  { value: "TOUS", label: "Clients et salariés" },
] as const;
