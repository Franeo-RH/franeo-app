// ─────────────────────────────────────────────────────────────────────────────
// NOUVEAUTÉS DE LA VERSION — à mettre à jour à chaque mise à jour publiée.
// Au premier affichage après le déploiement, une communication « Nouveautés »
// est créée automatiquement : clients et salariés la voient à leur connexion
// sur leur tableau de bord, jusqu'à ce qu'ils cliquent « J'ai lu ».
// Pour une nouvelle mise à jour : changez VERSION et les textes ci-dessous.
// ─────────────────────────────────────────────────────────────────────────────

export const VERSION = "V19 · novembre 2026";

export const NOUVEAUTES_CLIENTS = `Voici ce qui change dans votre espace :

• Espace salarié inclus dans toutes les formules, sans supplément.
• Badge : vos salariés pointent leur arrivée, leurs pauses et leur départ depuis leur téléphone ; l'adresse de chaque pointage est enregistrée. Les heures remplissent automatiquement les relevés mensuels.
• Gestion RH › Badge & présences : qui est présent aujourd'hui, l'adresse de chaque pointage, les oublis, le journal complet et l'export Excel.
• Arrêts de travail : vos salariés peuvent déclarer un arrêt depuis leur espace ; il vous est envoyé par e-mail avec le document en pièce jointe.
• Vos salariés peuvent pointer directement depuis leur tableau de bord (position requise au moment du pointage).
• Buddy apprend : les questions auxquelles il ne sait pas répondre sont transmises à FRANEO RH, qui lui apprend la réponse.
• Avantages mensuels : déclarez dans Mon entreprise vos tickets restaurant (valeur et part patronale), paniers repas et autres avantages (transport…), puis le montant de chacun dans la fiche du salarié. Ils sont ajoutés au coût employeur dans le suivi de la masse salariale.`;

export const NOUVEAUTES_SALARIES = `Nouveau dans votre espace salarié :

• Badge : pointez votre arrivée, vos pauses et votre départ en un clic, directement depuis votre tableau de bord. Autorisez la localisation : l'adresse de votre pointage est enregistrée (aucun suivi en continu).
• Vos heures badgées sont reportées automatiquement dans votre relevé mensuel.
• Votre historique de pointages des 14 derniers jours est visible sur votre tableau de bord.
• Arrêt de travail : déclarez-le dans Mon temps › Absences en joignant une photo de l'arrêt ; il est envoyé directement à votre employeur.`;

export const titreNouveautes = (cible: "CLIENTS" | "SALARIES") => `🚀 Nouveautés ${VERSION}${cible === "SALARIES" ? " — espace salarié" : ""}`;
