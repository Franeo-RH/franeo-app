// Demandes d'inscription / de contact (utilisable côté navigateur)
export const BESOINS = ["Paie", "Gestion RH", "Recrutement", "Espace salarié", "Formation", "Data / tableaux de bord", "Franeo'ptimz", "Site / application"] as const;
export const EFFECTIFS = ["1 à 5", "6 à 10", "11 à 20", "21 à 30", "Plus de 30"] as const;
export const STATUTS_INSCRIPTION: Record<string, { label: string; fond: string; texte: string }> = {
  NOUVELLE: { label: "🆕 Nouvelle", fond: "#fff7ed", texte: "#c2410c" },
  VALIDEE: { label: "✅ Validée", fond: "#dcfce7", texte: "#15803d" },
  REFUSEE: { label: "Refusée", fond: "#f3f4f6", texte: "#6b7280" },
};
