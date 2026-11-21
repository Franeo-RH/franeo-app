// lib/checklists.ts
// Étapes d'arrivée et de départ d'un salarié (sans base de données : utilisable dans le navigateur).

export type Etape = { cle: string; label: string; aide?: string };

export const ETAPES: Record<"ARRIVEE" | "DEPART", Etape[]> = {
  ARRIVEE: [
    { cle: "dpae", label: "DPAE envoyée à l'URSSAF", aide: "Au plus tôt 8 jours avant l'embauche, au plus tard juste avant la prise de poste." },
    { cle: "contrat", label: "Contrat de travail signé", aide: "Remis au plus tard 2 jours ouvrables après l'embauche (CDD)." },
    { cle: "registre", label: "Inscrit au registre unique du personnel" },
    { cle: "mutuelle", label: "Affiliation mutuelle et prévoyance" },
    { cle: "visite", label: "Visite d'information et de prévention demandée", aide: "Dans les 3 mois (avant la prise de poste pour un suivi renforcé)." },
    { cle: "documents", label: "Pièces reçues : RIB, pièce d'identité, carte Vitale" },
    { cle: "accueil", label: "Livret d'accueil, règlement intérieur, consignes de sécurité remis" },
    { cle: "acces", label: "Accès à l'espace salarié et outils créés" },
    { cle: "materiel", label: "Matériel, badge, tenue remis" },
  ],
  DEPART: [
    { cle: "notification", label: "Rupture notifiée (lettre, démission, rupture conventionnelle homologuée…)" },
    { cle: "preavis", label: "Préavis et dernier jour travaillé fixés" },
    { cle: "conges", label: "Solde des congés et heures calculé" },
    { cle: "stc", label: "Solde de tout compte établi et signé" },
    { cle: "certificat", label: "Certificat de travail remis" },
    { cle: "france_travail", label: "Attestation France Travail transmise" },
    { cle: "portabilite", label: "Portabilité mutuelle et prévoyance signalée" },
    { cle: "materiel", label: "Matériel, badge, clés restitués" },
    { cle: "acces", label: "Accès coupés (espace salarié, outils)" },
    { cle: "registre", label: "Date de sortie au registre unique du personnel" },
  ],
};
