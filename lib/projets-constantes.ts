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
  RECURRENT: "Contrat récurrent (montant mensuel)",
  INTERNE: "Projet interne (non facturé)",
} as const;

export const CATEGORIES_DEPENSE = {
  DEPLACEMENT: "🚗 Déplacements",
  MATERIEL: "🧰 Matériel",
  SOUS_TRAITANCE: "🤝 Sous-traitance",
  AUTRE: "📦 Autre",
} as const;

export const COULEURS_PROJET = ["#ea580c", "#2563eb", "#16a34a", "#9333ea", "#db2777", "#0891b2", "#ca8a04", "#4b5563"];


export const FACTURATION_JALON = {
  AUCUNE: { label: "Pas de facturation", couleur: "#6b7280" },
  A_FACTURER: { label: "À facturer", couleur: "#c2410c" },
  FACTURE: { label: "Facturé", couleur: "#2563eb" },
  PAYE: { label: "Payé", couleur: "#15803d" },
} as const;

export const NOMS_MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

// ───────── Devis & factures ─────────
export const TYPES_LIGNE = {
  MO: { label: "Main-d'œuvre", unite: "h" },
  ACHAT: { label: "Fourniture / matériel", unite: "u" },
  SOUS_TRAITANCE: { label: "Sous-traitance", unite: "forfait" },
  FORFAIT: { label: "Prestation forfaitaire", unite: "forfait" },
  DEPLACEMENT: { label: "Déplacement", unite: "u" },
} as const;

export const STATUTS_DEVIS = {
  BROUILLON: { label: "Brouillon", couleur: "#6b7280" },
  ENVOYE: { label: "Envoyé", couleur: "#2563eb" },
  ACCEPTE: { label: "Accepté", couleur: "#15803d" },
  REFUSE: { label: "Refusé", couleur: "#b91c1c" },
} as const;

export const TYPES_FACTURE = {
  ACOMPTE: "Acompte",
  SITUATION: "Situation de travaux",
  REGIE: "Régie (temps passé)",
  JALON: "Échéance",
  MENSUELLE: "Facture mensuelle",
  SOLDE: "Solde",
  AVOIR: "Avoir",
} as const;

export const STATUTS_FACTURE = {
  EMISE: { label: "À encaisser", couleur: "#c2410c" },
  PAYEE: { label: "Payée", couleur: "#15803d" },
  ANNULEE: { label: "Annulée", couleur: "#6b7280" },
} as const;

export const MENTION_FRANCHISE_TVA = "TVA non applicable, art. 293 B du CGI";
export const DELAI_PAIEMENT_JOURS = 30;

export type LigneDevis = { libelle: string; type: keyof typeof TYPES_LIGNE; quantite: number; unite: string; prixUnitaire: number; coutUnitaire: number; salarieId?: string | null };

/**
 * Modèles par métier : mode de vente conseillé, échéancier de facturation (en % du prix) et lignes de devis types.
 * Ils préremplissent le projet ou le devis ; tout reste modifiable ensuite.
 */
export const MODELES_METIER: Record<string, {
  label: string; icone: string; modeVente: keyof typeof MODES_VENTE; seuilAlerte: number;
  echeancier: { libelle: string; pct: number; jours: number }[]; // jours après le début du projet
  jalons: { libelle: string; jours: number }[];
  lignes: Omit<LigneDevis, "prixUnitaire" | "coutUnitaire" | "salarieId">[];
  conseil: string;
}> = {
  LIBRE: { label: "Projet libre", icone: "📐", modeVente: "FORFAIT", seuilAlerte: 80, echeancier: [], jalons: [], lignes: [], conseil: "Aucun préremplissage." },
  BTP: {
    label: "Bâtiment / artisan (chantier)", icone: "🏗️", modeVente: "FORFAIT", seuilAlerte: 75,
    echeancier: [{ libelle: "Acompte à la commande", pct: 30, jours: 0 }, { libelle: "Situation de travaux", pct: 40, jours: 30 }, { libelle: "Solde à la réception", pct: 30, jours: 60 }],
    jalons: [{ libelle: "Visite technique / métré", jours: 0 }, { libelle: "Commande des matériaux", jours: 3 }, { libelle: "Démarrage du chantier", jours: 7 }, { libelle: "Réception des travaux (PV)", jours: 60 }],
    lignes: [{ libelle: "Main-d'œuvre", type: "MO", quantite: 35, unite: "h" }, { libelle: "Matériaux et fournitures", type: "ACHAT", quantite: 1, unite: "forfait" }, { libelle: "Évacuation des déchets", type: "FORFAIT", quantite: 1, unite: "forfait" }, { libelle: "Déplacements", type: "DEPLACEMENT", quantite: 5, unite: "u" }],
    conseil: "Facturez des situations de travaux selon l'avancement et faites signer chaque travail supplémentaire avant de le réaliser.",
  },
  CONSEIL: {
    label: "Conseil / cabinet / agence", icone: "💼", modeVente: "FORFAIT", seuilAlerte: 80,
    echeancier: [{ libelle: "Acompte au lancement", pct: 30, jours: 0 }, { libelle: "Livrable intermédiaire", pct: 40, jours: 30 }, { libelle: "Solde à la livraison", pct: 30, jours: 60 }],
    jalons: [{ libelle: "Réunion de lancement", jours: 0 }, { libelle: "Livrable intermédiaire validé", jours: 30 }, { libelle: "Restitution finale", jours: 60 }],
    lignes: [{ libelle: "Consultant senior", type: "MO", quantite: 35, unite: "h" }, { libelle: "Consultant", type: "MO", quantite: 70, unite: "h" }, { libelle: "Frais de déplacement", type: "DEPLACEMENT", quantite: 2, unite: "u" }],
    conseil: "Suivez le taux d'occupation et faites valider chaque livrable par le client avant de facturer l'étape suivante.",
  },
  INFORMATIQUE: {
    label: "Informatique / numérique", icone: "💻", modeVente: "FORFAIT", seuilAlerte: 80,
    echeancier: [{ libelle: "Acompte", pct: 30, jours: 0 }, { libelle: "Recette", pct: 50, jours: 45 }, { libelle: "Mise en production", pct: 20, jours: 60 }],
    jalons: [{ libelle: "Cahier des charges validé", jours: 7 }, { libelle: "Recette client", jours: 45 }, { libelle: "Mise en production", jours: 60 }],
    lignes: [{ libelle: "Développement", type: "MO", quantite: 70, unite: "h" }, { libelle: "Gestion de projet", type: "MO", quantite: 14, unite: "h" }, { libelle: "Licences / hébergement", type: "ACHAT", quantite: 1, unite: "forfait" }],
    conseil: "Pour la maintenance, créez un contrat récurrent avec un montant mensuel.",
  },
  MAINTENANCE: {
    label: "Industrie / maintenance", icone: "🔧", modeVente: "REGIE", seuilAlerte: 85,
    echeancier: [],
    jalons: [{ libelle: "Diagnostic", jours: 0 }, { libelle: "Intervention", jours: 7 }, { libelle: "Rapport d'intervention", jours: 10 }],
    lignes: [{ libelle: "Technicien", type: "MO", quantite: 14, unite: "h" }, { libelle: "Pièces détachées", type: "ACHAT", quantite: 1, unite: "forfait" }, { libelle: "Déplacement", type: "DEPLACEMENT", quantite: 1, unite: "u" }],
    conseil: "Facturez en régie à partir des temps pointés, ou en contrat récurrent pour la maintenance préventive.",
  },
  SERVICES: {
    label: "Services sur site (propreté, sécurité, aide)", icone: "🧹", modeVente: "RECURRENT", seuilAlerte: 85,
    echeancier: [],
    jalons: [{ libelle: "Visite de démarrage", jours: 0 }, { libelle: "Point qualité avec le client", jours: 90 }],
    lignes: [{ libelle: "Prestation mensuelle", type: "MO", quantite: 60, unite: "h" }, { libelle: "Produits et consommables", type: "ACHAT", quantite: 1, unite: "forfait" }],
    conseil: "Contrat récurrent : une facture par mois, et le badge sur site prouve les heures réalisées.",
  },
  EVENEMENT: {
    label: "Événementiel / formation", icone: "🎪", modeVente: "FORFAIT", seuilAlerte: 80,
    echeancier: [{ libelle: "Acompte à la réservation", pct: 50, jours: 0 }, { libelle: "Solde après l'événement", pct: 50, jours: 30 }],
    jalons: [{ libelle: "Réservation des prestataires", jours: 3 }, { libelle: "Jour J", jours: 25 }, { libelle: "Bilan avec le client", jours: 30 }],
    lignes: [{ libelle: "Équipe sur place", type: "MO", quantite: 21, unite: "h" }, { libelle: "Location matériel / salle", type: "SOUS_TRAITANCE", quantite: 1, unite: "forfait" }, { libelle: "Logistique", type: "DEPLACEMENT", quantite: 1, unite: "forfait" }],
    conseil: "Encaissez un acompte important avant d'engager les prestataires.",
  },
};
