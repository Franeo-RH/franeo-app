// Grille tarifaire FRANEO RH (novembre 2026). Sert au script prisma/grille-2026.ts et aux pages d'abonnement.

export const GRILLE_RH = [
  {
    nom: "RH Basic", prixMensuel: 50, salariesInclus: 15, prixSalarieSupp: 5, ticketsRH: 0, prixTicketSupp: 70,
    recommande: false, message: "",
    features: ["Jusqu'à 15 salariés inclus", "5 € / salarié supplémentaire", "Application RH", "Fiches salariés", "Gestion des absences"],
  },
  {
    nom: "RH Essentiel", prixMensuel: 149, salariesInclus: 25, prixSalarieSupp: 4, ticketsRH: 3, prixTicketSupp: 40,
    recommande: false, message: "Jusqu'à 25 salariés inclus puis seulement 4 € par salarié supplémentaire.",
    features: ["Jusqu'à 25 salariés inclus", "4 € / salarié supplémentaire", "3 tickets RH / mois", "SharePoint inclus", "Conseil RH ponctuel", "Suivi des périodes d'essai", "Toutes les fonctionnalités Basic"],
  },
  {
    nom: "RH Sérénité", prixMensuel: 299, salariesInclus: 50, prixSalarieSupp: 3, ticketsRH: 5, prixTicketSupp: 30,
    recommande: true, message: "La formule idéale pour structurer sereinement la gestion RH de votre entreprise.",
    features: ["Jusqu'à 50 salariés inclus", "3 € / salarié supplémentaire", "5 tickets RH / mois", "Signatures électroniques illimitées", "Conseil RH ponctuel", "Suivi périodes d'essai", "Suivi visites médicales", "Assistance contrats & avenants", "Toutes les fonctionnalités Essentiel"],
  },
  {
    nom: "RH Premium", prixMensuel: 449, salariesInclus: 100, prixSalarieSupp: 2, ticketsRH: 10, prixTicketSupp: 20,
    recommande: false, message: "Plus votre entreprise grandit, plus le coût par salarié diminue.",
    features: ["Jusqu'à 100 salariés inclus", "2 € / salarié supplémentaire", "10 tickets RH / mois", "Diagnostic RH initial", "Accompagnement prioritaire", "Toutes les fonctionnalités Franeo RH"],
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
    features: ["Jusqu'à 50 salariés", "Tout Essentielle", "Relance des variables incluse", "Suivi des IJSS inclus", "Suivi des échéances inclus", "Veille réglementaire incluse"],
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
