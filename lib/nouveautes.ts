// ─────────────────────────────────────────────────────────────────────────────
// MISES À JOUR DE L'APPLICATION — à compléter à chaque version publiée.
// Ajoutez la nouvelle version EN HAUT de la liste. Au premier affichage après le déploiement,
// elle est publiée automatiquement : clients et salariés voient le résumé de la DERNIÈRE mise à jour
// sur leur tableau de bord (jusqu'à « J'ai lu »), et l'historique complet dans Communication › Mises à jour.
// ─────────────────────────────────────────────────────────────────────────────

export type MiseAJour = {
  version: string;
  date: string; // affichage : « novembre 2026 »
  titre: string; // phrase d'accroche
  clients: string[]; // une nouveauté par ligne
  salaries?: string[]; // nouveautés de l'espace salarié (facultatif)
};

export const MISES_A_JOUR: MiseAJour[] = [
  {
    version: "V52",
    date: "novembre 2026",
    titre: "Courriers types, accidents du travail et déclaration de sortie",
    clients: [
      "✉️ Courriers & modèles (Gestion RH) : rupture et renouvellement de période d'essai, relances, attestation employeur… Les informations du salarié se remplissent toutes seules ; imprimez ou enregistrez en PDF à votre logo, ou envoyez par e-mail. Créez aussi vos propres modèles.",
      "📄 Contrats et courriers types : inclus dès la formule Essentiel, option à 5 € HT/mois avec la formule Basic. 📐 Option Projets : 29 € HT/mois avec Basic ou Essentiel, incluse dès Sérénité.",
      "🩹 Accidents du travail (Gestion RH) : vos salariés déclarent un accident depuis leur espace. Vous êtes prévenu par e-mail et suivez le dossier : déclaration à la CPAM sous 48 heures, réserves, réponses au questionnaire de la CPAM, décision.",
      "🚪 Paie › Déclarer une sortie : motif, dates, préavis et éléments de fin de contrat, avec le solde de congés du salarié.",
      "💬 Devis et demandes : échangez avec FRANEO RH et retrouvez les documents directement sur chaque demande.",
      "🤖 Buddy sait maintenant chercher l'information dans votre espace (soldes de congés, absences, échéances, accidents…).",
    ],
    salaries: [
      "🧭 Nouvel espace plus simple : toutes vos démarches dans le menu (demander un congé, déclarer un arrêt, déclarer un accident, note de frais, relevé mensuel…) et en raccourcis sur l'accueil.",
      "🩹 Accident du travail ou de trajet : déclarez-le à votre employeur en quelques minutes.",
    ],
  },
  {
    version: "V44",
    date: "novembre 2026",
    titre: "Établissements, option Projets et fichiers Excel fiabilisés",
    clients: [
      "📐 Option Projets, planning & rentabilité (29 € HT / mois) : demandez-la en un clic dans Mon entreprise › Abonnement.",
      "💳 Formules RH : 2 € par salarié au-delà des salariés inclus, quelle que soit la formule.",
      "🏖️ Soldes de congés payés calculés automatiquement pour tous vos salariés (Gestion RH › Soldes de congés), visibles dans leur fiche, leur espace salarié et par leur manager. Importez vos soldes au début ou chaque mois pour les caler sur votre paie. BTP : règles de la caisse CIBTP (1er avril au 31 mars, 150 heures = 2,5 jours).",
      "🔑 Accès dirigeants d'établissement : dans Mon entreprise, créez un accès pour le responsable de chaque établissement. Il ne voit que ses salariés, leurs absences, relevés, paie et les projets de son établissement.",
      "🏢 Établissements : ajoutez le SIRET de chacun (14 chiffres).",
      "📐 Projets : nouvelle présentation en cartes (ou en tableau), filtres par statut et par établissement, fiche projet organisée en onglets (synthèse, équipe & planning, étapes, temps, frais).",
      "📊 Fichiers Excel : présentation simplifiée aux couleurs FRANEO RH, qui s'ouvre sans message d'erreur.",
      "🔐 Sécurité et RGPD : blocage après plusieurs mots de passe erronés, mots de passe de 10 caractères minimum, export et anonymisation des données d'un salarié depuis sa fiche, pages Confidentialité et Mentions légales.",
      "🤖 Buddy exécute vos demandes (absences, variables, salariés, tickets, projets) et répond avec les réponses préparées par FRANEO RH.",
      "🚀 Retrouvez l'historique des mises à jour dans Communication › Mises à jour.",
    ],
    salaries: [
      "🏖️ Mes congés payés : votre solde (reste à prendre, en cours d'acquisition) est sur votre tableau de bord ; les managers voient celui de leur équipe.",
      "🔐 Mes données personnelles : téléchargez toutes vos informations depuis votre tableau de bord.",
      "🔑 Mot de passe : 10 caractères minimum, avec au moins une lettre et un chiffre.",
    ],
  },
  {
    version: "V19",
    date: "novembre 2026",
    titre: "Badge, arrêts de travail et avantages mensuels",
    clients: [
      "📱 Espace salarié inclus dans toutes les formules, sans supplément.",
      "📍 Badge : vos salariés pointent leur arrivée, leurs pauses et leur départ depuis leur téléphone ; l'adresse de chaque pointage est enregistrée et les heures remplissent les relevés mensuels.",
      "👀 Gestion RH › Badge & présences : qui est présent, les oublis, le journal complet et l'export Excel.",
      "🤒 Arrêts de travail : déclarés par vos salariés depuis leur espace, envoyés par e-mail avec le document.",
      "🍽️ Avantages mensuels : tickets restaurant, paniers et autres avantages ajoutés au coût employeur.",
    ],
    salaries: [
      "📍 Badge : pointez votre arrivée, vos pauses et votre départ en un clic depuis votre tableau de bord.",
      "⏱️ Vos heures badgées sont reportées automatiquement dans votre relevé mensuel.",
      "🤒 Arrêt de travail : déclarez-le dans Mon temps › Absences en joignant une photo.",
    ],
  },
];

export type CibleMiseAJour = "CLIENTS" | "SALARIES";

export const titreMiseAJour = (m: MiseAJour, cible: CibleMiseAJour) => `🚀 Mise à jour ${m.version} — ${m.titre}${cible === "SALARIES" ? " (espace salarié)" : ""}`;

/** Texte enregistré dans la communication : accroche puis une ligne par nouveauté */
export const contenuMiseAJour = (m: MiseAJour, cible: CibleMiseAJour) =>
  [`${m.version} · ${m.date}`, ...(cible === "SALARIES" ? m.salaries ?? [] : m.clients).map((l) => `• ${l}`)].join("\n");
