// Champs modifiables par l'admin, par modèle (utilisable côté navigateur)
export type Champ = { type: "texte" | "nombre" | "date" | "booleen" | "liste"; options?: string[] };

export const MODIFIABLES: Record<string, Record<string, Champ>> = {
  absence: {
    type: { type: "liste", options: ["CONGE_PAYE", "RTT", "CONGE_SANS_SOLDE", "CONGE_EXCEPTIONNEL", "CONGE_NAISSANCE", "MATERNITE_PATERNITE", "MALADIE", "ABSENCE_NON_REMUNEREE"] },
    dateDebut: { type: "date" }, dateFin: { type: "date" },
    statut: { type: "liste", options: ["En attente", "Validé", "Refusé"] }, commentaire: { type: "texte" },
  },
  variablePaie: {
    type: { type: "liste", options: ["HEURE_SUPPLEMENTAIRE", "PRIME", "NOTE_FRAIS", "ACOMPTE"] },
    valeur: { type: "nombre" }, mois: { type: "nombre" }, annee: { type: "nombre" },
    statut: { type: "liste", options: ["En attente", "Validé"] }, commentaire: { type: "texte" },
  },
  ticket: { titre: { type: "texte" }, statut: { type: "liste", options: ["Ouvert", "En cours", "Clôturé"] } },
  ticketSupport: { titre: { type: "texte" }, statut: { type: "liste", options: ["Ouvert", "En cours", "Clôturé"] } },
  facturation: {
    montant: { type: "nombre" }, statut: { type: "liste", options: ["En attente", "Payé", "En retard"] },
    dateLimitePaie: { type: "date" }, commentaire: { type: "texte" },
  },
  rappelSalarie: { libelle: { type: "texte" }, dateEcheance: { type: "date" }, traite: { type: "booleen" }, commentaire: { type: "texte" } },
  releveMois: { statut: { type: "liste", options: ["Brouillon", "Envoyé", "Validé", "Refusé"] }, motifRefus: { type: "texte" } },
  commandePrestation: { quantite: { type: "nombre" }, prixUnitaire: { type: "nombre" }, statut: { type: "liste", options: ["A_FAIRE", "FAITE", "ANNULEE"] }, commentaire: { type: "texte" } },
  demandeRecrutement: { poste: { type: "texte" }, statut: { type: "texte" }, candidat: { type: "texte" }, categorie: { type: "liste", options: ["NON_QUALIFIE", "TECHNICIEN", "EXPERT"] } },
};


export const LIBELLES_CHAMPS: Record<string, string> = {
  type: "Type", dateDebut: "Date de début", dateFin: "Date de fin", statut: "Statut", commentaire: "Commentaire", valeur: "Valeur",
  mois: "Mois", annee: "Année", titre: "Titre", montant: "Montant (€)", dateLimitePaie: "Date limite de paiement", libelle: "Libellé",
  dateEcheance: "Échéance", traite: "Traité", motifRefus: "Motif du refus", quantite: "Quantité", prixUnitaire: "Prix unitaire",
  poste: "Poste", candidat: "Candidat", categorie: "Catégorie",
};
