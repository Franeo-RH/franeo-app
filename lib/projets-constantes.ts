// Constantes de l'option Projets, utilisables côté navigateur (sans accès à la base)

export const STATUTS_PROJET = {
  PREVU: { label: "Prévu", couleur: "#6b7280" },
  EN_COURS: { label: "En cours", couleur: "#2563eb" },
  TERMINE: { label: "Terminé", couleur: "#15803d" },
  ANNULE: { label: "Annulé", couleur: "#b91c1c" },
} as const;

export const MODES_VENTE = {
  FORFAIT: "Forfait",
  REGIE: "Régie (taux journalier)",
  INTERNE: "Projet interne (non facturé)",
} as const;

export const CATEGORIES_DEPENSE = {
  DEPLACEMENT: "🚗 Déplacements",
  MATERIEL: "🧰 Matériel",
  SOUS_TRAITANCE: "🤝 Sous-traitance",
  AUTRE: "📦 Autre",
} as const;

export const COULEURS_PROJET = ["#ea580c", "#2563eb", "#16a34a", "#9333ea", "#db2777", "#0891b2", "#ca8a04", "#4b5563"];

