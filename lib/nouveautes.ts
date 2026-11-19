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
    version: "V64",
    date: "novembre 2026",
    titre: "Un nouveau look et l'accès pour votre cabinet comptable",
    clients: [
      "✨ Nouveau design « verre dépoli » : fond lumineux, cartes translucides, menus plus légers.",
      "🏛️ Accès cabinet : votre expert-comptable peut suivre votre dossier depuis son propre accès (variables de paie, absences, documents). Le cabinet qui a accès à votre dossier est indiqué dans Mon entreprise.",
    ],
    salaries: ["✨ Nouveau design « verre dépoli » de votre espace."],
  },
  {
    version: "V61",
    date: "novembre 2026",
    titre: "Paiement des abonnements par prélèvement SEPA",
    clients: [
      "💶 Les abonnements FRANEO RH sont désormais réglés par prélèvement SEPA mensuel : la facture vous est envoyée par e-mail, puis prélevée au plus tôt 2 jours après.",
      "✍️ Signez votre mandat en 1 minute dans Mon entreprise › Prélèvement des abonnements, sur la page sécurisée de Stripe. Votre IBAN n'est pas enregistré dans Franeo.",
      "🔁 Changement de banque : « Changer d'IBAN » au même endroit.",
    ],
  },
  {
    version: "V60",
    date: "novembre 2026",
    titre: "Connexion plus sûre et invitations par e-mail",
    clients: [
      "🔐 Double authentification : après le mot de passe, un code à 6 chiffres est envoyé par e-mail (valable 10 minutes). Cochez « Faire confiance à cet appareil » pour ne plus le saisir pendant 30 jours.",
      "✉️ Ajout d'un salarié : cochez « Créer un accès à l'espace salarié » et il reçoit directement un e-mail pour choisir son mot de passe.",
      "👤 Fiche salarié : « Inviter par e-mail » et « Renvoyer l'invitation » remplacent le lien à copier.",
    ],
    salaries: [
      "🔐 Connexion protégée par un code reçu par e-mail, avec l'option de faire confiance à votre appareil pendant 30 jours.",
    ],
  },
  {
    version: "V59",
    date: "novembre 2026",
    titre: "Nouvelle grille tarifaire FRANEO RH",
    clients: [
      "💳 Packs RH : Basic 50 €, Essentiel 149 €, Sérénité 299 €, Premium 449 € par mois (2 € par salarié supplémentaire). Ticket RH supplémentaire : 50 € en Basic, 40 € en Essentiel, 30 € en Sérénité, 20 € en Premium.",
      "💰 Formules paie : un pack RH est inclus (RH Basic avec Paie Essentielle et Sérénité, RH Sérénité avec Paie Premium) et n'est plus facturé en plus. Reprise du dossier incluse, assistance contrôle URSSAF sur devis.",
      "🧩 Options : génération de contrats et documents 5 € (incluse avec RH Essentiel, Sérénité, Premium et Paie Sérénité, Premium), suivi médical complet 5 € (inclus avec RH et Paie Sérénité, Premium), Projets 29 € (inclus avec RH Premium et Paie Premium).",
      "🎫 Un ticket RH couvre n'importe quelle prestation du catalogue à l'unité, sans supplément.",
      "🎁 Essai gratuit de l'application Franeo RH jusqu'au 31/12/2026.",
    ],
  },
  {
    version: "V57",
    date: "novembre 2026",
    titre: "Nouveaux modèles de contrats de travail, à votre logo",
    clients: [
      "📝 Contrats : 7 modèles détaillés prêts à l'emploi — CDI et CDD de droit commun, ouvrier du Bâtiment (BTP), Syntec, hôtels-cafés-restaurants, commerce alimentaire, propreté. Le modèle de votre convention collective est mis en avant et les clauses propres à la convention sont pré-remplies.",
      "🏢 Votre logo apparaît en haut de chaque page des contrats générés, y compris avec vos propres modèles Word.",
      "🧩 Rappel : options à la carte dans Mon entreprise (Documents & contrats, Suivi médical complet, Projets) et suivi médical complet dans Gestion RH › Dossiers.",
    ],
  },
  {
    version: "V56",
    date: "novembre 2026",
    titre: "Options à la carte et suivi médical complet",
    clients: [
      "🧩 Activez ou arrêtez vos options à tout moment dans Mon entreprise : Documents & contrats (5 € HT/mois), Suivi médical complet (5 € HT/mois), Projets (29 € HT/mois). Elles sont incluses dès les formules Sérénité, RH comme paie (et Documents & contrats dès RH Essentiel).",
      "🩺 Suivi médical complet (Gestion RH › Dossiers) : type de suivi de chaque salarié, prochaine visite calculée automatiquement et ajoutée à vos échéances, visites de reprise après un arrêt et visite de mi-carrière.",
      "💬 Conseil RH ponctuel : 5 demandes par mois avec la formule Basic, 10 avec Essentiel, illimité dès Sérénité. Votre compteur du mois est affiché sur la page des demandes.",
      "💶 L'estimation de votre facture du mois, options comprises, est affichée dans Mon entreprise.",
    ],
  },
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
