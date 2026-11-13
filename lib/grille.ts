// Grille tarifaire FRANEO RH (novembre 2026). Sert au script prisma/grille-2026.ts et aux pages d'abonnement.

export const MENTION_VISITE_MEDICALE = "Suivi des visites médicales : suivi des échéances et convocation des salariés inclus ; le coût facturé par le service de santé au travail reste à votre charge.";

export const GRILLE_RH = [
  {
    nom: "RH Basic", prixMensuel: 50, salariesInclus: 15, prixSalarieSupp: 5, ticketsRH: 0, prixTicketSupp: 70,
    recommande: false, message: "",
    features: [
      "Jusqu'à 15 salariés inclus", "5 € / salarié supplémentaire",
      "Application RH : ajouter, modifier, importer et supprimer vos salariés",
      "Mouvements du personnel", "Saisie des absences", "Communication & helpdesk",
      "Ticket RH à la demande : 70 € / demande",
      "Espace salarié inclus (absences, relevés, badge, notes de frais)",
    ],
  },
  {
    nom: "RH Essentiel", prixMensuel: 149, salariesInclus: 25, prixSalarieSupp: 4, ticketsRH: 3, prixTicketSupp: 40,
    recommande: false, message: "Jusqu'à 25 salariés inclus puis seulement 4 € par salarié supplémentaire.",
    features: [
      "Toutes les fonctionnalités Basic", "Jusqu'à 25 salariés inclus", "4 € / salarié supplémentaire",
      "3 tickets RH / mois", "Conseil RH ponctuel illimité", "Suivi complet des échéances", "Suivi des périodes d'essai", "SharePoint inclus",
      "Espace salarié inclus",
    ],
  },
  {
    nom: "RH Sérénité", prixMensuel: 299, salariesInclus: 50, prixSalarieSupp: 3, ticketsRH: 5, prixTicketSupp: 30,
    recommande: true, message: "La formule idéale pour structurer sereinement la gestion RH de votre entreprise.",
    features: [
      "Toutes les fonctionnalités Essentiel", "Jusqu'à 50 salariés inclus", "3 € / salarié supplémentaire",
      "5 tickets RH / mois", "Saisie des informations de paie", "Contrats générés automatiquement depuis vos modèles",
      "Signatures électroniques illimitées", "Suivi des visites médicales (suivi et convocation, hors coût du centre de santé au travail)",
      "Assistance contrats & avenants",
    ],
  },
  {
    nom: "RH Premium", prixMensuel: 449, salariesInclus: 100, prixSalarieSupp: 2, ticketsRH: 10, prixTicketSupp: 20,
    recommande: false, message: "Plus votre entreprise grandit, plus le coût par salarié diminue.",
    features: [
      "Toutes les fonctionnalités Sérénité", "Jusqu'à 100 salariés inclus", "2 € / salarié supplémentaire",
      "10 tickets RH / mois", "Saisie des informations de paie", "App Franeo Analytics incluse (sur demande)",
      "Diagnostic RH initial", "Accompagnement prioritaire",
    ],
  },
] as const;

export const GRILLE_PAIE = [
  {
    code: "ESSENTIELLE", nom: "Paie Essentielle", couleur: "#6366f1", prixMensuel: 249, bulletinsInclus: 20, prixBulletinSupp: 15,
    prixTicketSupp: 40, prixRdv: 49, recommande: false,
    features: ["Jusqu'à 20 salariés", "Logiciel de paie inclus", "Application Franeo + Buddy", "DSN incluses", "Entrées / sorties incluses", "Reprise dossier incluse"],
    options: ["Conseil RH / Paie : 40 € / ticket", "Rendez-vous paie : 49 € / rendez-vous", "Bulletin supplémentaire : 15 € / bulletin", "Assistance contrôle URSSAF : sur devis"],
    flags: { relancesVariables: false, suiviIJSS: false, suiviRH: false, veillePaie: false, conseilPaie: false, pointPaie: false, traitementPrioritaire: false },
  },
  {
    code: "SERENITE", nom: "Paie Sérénité", couleur: "#f97316", prixMensuel: 399, bulletinsInclus: 50, prixBulletinSupp: 13,
    prixTicketSupp: 30, prixRdv: 39, recommande: true,
    features: ["Jusqu'à 50 salariés", "Tout Essentielle", "Relance des variables incluse", "Suivi des IJSS inclus", "Suivi des échéances inclus (visites médicales : suivi et convocation, hors coût du centre)", "Veille réglementaire incluse"],
    options: ["Conseil RH / Paie : 30 € / ticket", "Rendez-vous paie : 39 € / rendez-vous", "Bulletin supplémentaire : 13 € / bulletin", "Assistance contrôle URSSAF : sur devis"],
    flags: { relancesVariables: true, suiviIJSS: true, suiviRH: true, veillePaie: true, conseilPaie: false, pointPaie: false, traitementPrioritaire: false },
  },
  {
    code: "PREMIUM", nom: "Paie Premium", couleur: "#111827", prixMensuel: 699, bulletinsInclus: 100, prixBulletinSupp: 10,
    prixTicketSupp: 20, prixRdv: 29, recommande: false,
    features: ["Jusqu'à 100 salariés", "Tout Sérénité", "Référent dédié", "Conseil paie renforcé", "Rendez-vous trimestriel inclus", "Priorité de traitement"],
    options: ["Conseil RH / Paie : 20 € / ticket", "Rendez-vous supplémentaire : 29 € / rendez-vous", "Bulletin supplémentaire : 10 € / bulletin", "Assistance contrôle URSSAF : sur devis"],
    flags: { relancesVariables: true, suiviIJSS: true, suiviRH: true, veillePaie: true, conseilPaie: true, pointPaie: true, traitementPrioritaire: true },
  },
] as const;

export const detailPaie = (code: string) => GRILLE_PAIE.find((g) => g.code === code);
export const detailRH = (nom: string) => GRILLE_RH.find((g) => g.nom === nom);
