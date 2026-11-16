// Grille tarifaire FRANEO RH (novembre 2026). Sert au script prisma/grille-2026.ts et aux pages d'abonnement.

export const MENTION_VISITE_MEDICALE = "Suivi des visites médicales : suivi des échéances et convocation des salariés inclus ; le coût facturé par le service de santé au travail reste à votre charge.";

// Grille du 16/11/2026 (document « Tarifs FRANEO RH ») : 2 € par salarié supplémentaire dans tous les packs RH
export const GRILLE_RH = [
  {
    nom: "RH Basic", prixMensuel: 50, salariesInclus: 25, prixSalarieSupp: 2, ticketsRH: 0, prixTicketSupp: 50,
    recommande: false, message: "Pour démarrer : l'application RH complète, et des tickets RH à 50 € quand vous en avez besoin.",
    features: [
      "Jusqu'à 25 salariés inclus", "2 € / salarié supplémentaire",
      "Ticket RH à la demande : 50 € / ticket", "Conseil RH ponctuel : 5 demandes / mois",
      "Application RH : fiches salariés, absences", "Espace salarié, badge de pointage géolocalisé",
      "Suivi des soldes de congés", "Accès dirigeant d'établissement",
      "Options : contrats et documents 5 € · suivi médical complet 5 € · Projets 29 € / mois",
    ],
  },
  {
    nom: "RH Essentiel", prixMensuel: 149, salariesInclus: 25, prixSalarieSupp: 2, ticketsRH: 3, prixTicketSupp: 40,
    recommande: false, message: "3 tickets RH et 10 demandes de conseil par mois, avec la génération de contrats et documents.",
    features: [
      "Toutes les fonctionnalités Basic", "Jusqu'à 25 salariés inclus", "2 € / salarié supplémentaire",
      "3 tickets RH / mois · 40 € le ticket supplémentaire", "Conseil RH ponctuel : 10 demandes / mois",
      "SharePoint", "Suivi des périodes d'essai", "Génération de contrats et documents incluse",
      "Options : suivi médical complet 5 € · Projets 29 € / mois",
    ],
  },
  {
    nom: "RH Sérénité", prixMensuel: 299, salariesInclus: 50, prixSalarieSupp: 2, ticketsRH: 5, prixTicketSupp: 30,
    recommande: true, message: "La formule idéale pour structurer sereinement la gestion RH de votre entreprise.",
    features: [
      "Toutes les fonctionnalités Essentiel", "Jusqu'à 50 salariés inclus", "2 € / salarié supplémentaire",
      "5 tickets RH / mois · 30 € le ticket supplémentaire", "Conseil RH ponctuel illimité",
      "Signatures électroniques illimitées", "Assistance contrats et avenants",
      "Génération de contrats et documents incluse", "Suivi médical complet inclus (hors coût du service de santé au travail)",
      "Option Projets 29 € / mois",
    ],
  },
  {
    nom: "RH Premium", prixMensuel: 449, salariesInclus: 100, prixSalarieSupp: 2, ticketsRH: 10, prixTicketSupp: 20,
    recommande: false, message: "Plus votre entreprise grandit, plus le coût par salarié diminue.",
    features: [
      "Toutes les fonctionnalités Sérénité", "Jusqu'à 100 salariés inclus", "2 € / salarié supplémentaire",
      "10 tickets RH / mois · 20 € le ticket supplémentaire", "Conseil RH ponctuel illimité",
      "Diagnostic RH initial", "Accompagnement prioritaire",
      "Toutes les options incluses : contrats et documents, suivi médical complet, Projets",
    ],
  },
] as const;

export const GRILLE_PAIE = [
  {
    code: "ESSENTIELLE", nom: "Paie Essentielle", couleur: "#6366f1", prixMensuel: 249, bulletinsInclus: 25, prixBulletinSupp: 15,
    prixTicketSupp: 40, prixRdv: 49, recommande: false,
    features: ["Jusqu'à 25 salariés", "Pack RH Basic inclus", "Logiciel de paie inclus", "DSN, entrées / sorties et reprise du dossier incluses", "Application Franeo + Buddy"],
    options: ["Conseil RH / paie : 40 € / ticket", "Rendez-vous paie : 49 € / rendez-vous", "Bulletin supplémentaire : 15 € / bulletin", "Assistance contrôle URSSAF : sur devis", "Options : contrats et documents 5 € · suivi médical complet 5 € · Projets 29 € / mois"],
    flags: { relancesVariables: false, suiviIJSS: false, suiviRH: false, veillePaie: false, conseilPaie: false, pointPaie: false, traitementPrioritaire: false },
  },
  {
    code: "SERENITE", nom: "Paie Sérénité", couleur: "#f97316", prixMensuel: 399, bulletinsInclus: 50, prixBulletinSupp: 13,
    prixTicketSupp: 30, prixRdv: 39, recommande: true,
    features: ["Jusqu'à 50 salariés", "Pack RH Basic inclus", "Tout Essentielle", "Relance des variables, suivi des IJSS et des échéances", "Veille réglementaire", "Contrats et documents, suivi médical complet inclus"],
    options: ["Conseil RH / paie : 30 € / ticket", "Rendez-vous paie : 39 € / rendez-vous", "Bulletin supplémentaire : 13 € / bulletin", "Assistance contrôle URSSAF : sur devis", "Option Projets : 29 € / mois"],
    flags: { relancesVariables: true, suiviIJSS: true, suiviRH: true, veillePaie: true, conseilPaie: false, pointPaie: false, traitementPrioritaire: false },
  },
  {
    code: "PREMIUM", nom: "Paie Premium", couleur: "#111827", prixMensuel: 699, bulletinsInclus: 100, prixBulletinSupp: 10,
    prixTicketSupp: 20, prixRdv: 29, recommande: false,
    features: ["Jusqu'à 100 salariés", "Pack RH Sérénité inclus", "Tout Sérénité", "Référent dédié et conseil renforcé", "Rendez-vous trimestriel inclus", "Priorité de traitement", "Toutes les options incluses"],
    options: ["Conseil RH / paie : 20 € / ticket", "Rendez-vous supplémentaire : 29 € / rendez-vous (en plus du trimestriel)", "Bulletin supplémentaire : 10 € / bulletin", "Assistance contrôle URSSAF : sur devis"],
    flags: { relancesVariables: true, suiviIJSS: true, suiviRH: true, veillePaie: true, conseilPaie: true, pointPaie: true, traitementPrioritaire: true },
  },
] as const;

/** Mentions de la grille tarifaire */
export const MENTIONS_TARIFS = [
  "Abonnements mensuels sans engagement · TVA non applicable, art. 293 B du CGI.",
  "Essai gratuit de l'application Franeo RH jusqu'au 31/12/2026.",
  "Un ticket RH couvre n'importe quelle prestation du catalogue à l'unité, sans supplément.",
  "Plus de 100 salariés : devis personnalisé.",
];

export const detailRH = (nom: string) => GRILLE_RH.find((g) => g.nom === nom);
export const detailPaie = (code: string) => GRILLE_PAIE.find((g) => g.code === code);
