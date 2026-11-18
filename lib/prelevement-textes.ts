// lib/prelevement-textes.ts
// Textes et statuts du prélèvement SEPA (utilisables côté navigateur).

export const STATUTS_MANDAT: Record<string, { label: string; couleur: string; fond: string }> = {
  ACTIF: { label: "Mandat actif", couleur: "#15803d", fond: "#dcfce7" },
  EN_ATTENTE: { label: "Mandat en cours de validation", couleur: "#b45309", fond: "#fef3c7" },
  INACTIF: { label: "Mandat révoqué ou expiré", couleur: "#b91c1c", fond: "#fee2e2" },
};

export const TEXTE_PRELEVEMENT =
  "Les abonnements FRANEO RH sont réglés par prélèvement SEPA mensuel. Chaque mois, votre facture vous est envoyée par e-mail, puis le montant est prélevé au plus tôt 2 jours après (elle vaut avis de prélèvement).";
