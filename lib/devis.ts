// Statuts des demandes de devis (utilisable côté navigateur)
export const STATUTS_DEVIS: Record<string, { label: string; fond: string; texte: string }> = {
  EN_ATTENTE: { label: "⏳ En attente de proposition", fond: "#fff7ed", texte: "#c2410c" },
  ENVOYE: { label: "📩 Proposition reçue", fond: "#dbeafe", texte: "#1d4ed8" },
  ACCEPTE: { label: "✅ Accepté", fond: "#dcfce7", texte: "#15803d" },
  REFUSE: { label: "❌ Refusé", fond: "#fee2e2", texte: "#b91c1c" },
  ANNULE: { label: "Annulé", fond: "#f3f4f6", texte: "#6b7280" },
};

export type LigneDevis = { code: string; libelle: string; famille: string; quantite: number; prix: number | null; apartir: boolean; total: number | null; precision?: string };
export type DevisVue = {
  id: string; createdAt: string; statut: string; lignes: LigneDevis[]; totalIndicatif: number; message: string | null;
  montantPropose: number | null; reponse: string | null; auteur: string | null; entreprise?: { nom: string };
};
