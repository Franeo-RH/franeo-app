// Statuts des demandes RH ponctuelles (utilisable côté navigateur)
export const STATUTS_QUESTION: Record<string, { label: string; fond: string; texte: string }> = {
  OUVERTE: { label: "⏳ En attente de réponse", fond: "#fff7ed", texte: "#c2410c" },
  REPONDUE: { label: "✅ Répondu", fond: "#dcfce7", texte: "#15803d" },
  TICKET: { label: "🎫 À passer en ticket", fond: "#dbeafe", texte: "#1d4ed8" },
  CLOSE: { label: "Close", fond: "#f3f4f6", texte: "#6b7280" },
};

export const REPONSE_TICKET =
  "Merci pour votre question. Pour ce type de demande, merci d'ouvrir un ticket RH : nous pourrons la traiter en détail.";

export type QuestionVue = {
  id: string; sujet: string; statut: string; auteur: string; createdAt: string; updatedAt: string;
  entreprise?: { nom: string };
  messages: { id: string; role: string; auteur: string; contenu: string; createdAt: string; versTicket: boolean }[];
};
