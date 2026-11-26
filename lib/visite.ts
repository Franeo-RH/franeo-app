// Présentation guidée : toutes les fonctions, simplement, pour chaque profil.
// Affichée à chaque ouverture de la démo, et à la première connexion d'un vrai compte.

export type ProfilVisite = "dirigeant" | "salarie" | "manager" | "cabinet";
export type EtapeVisite = { ico: string; titre: string; texte: string; points?: string[] };

export const VISITES: Record<ProfilVisite, { titre: string; etapes: EtapeVisite[] }> = {
  dirigeant: {
    titre: "Bienvenue dans votre espace Franeo RH",
    etapes: [
      { ico: "👋", titre: "Bienvenue !", texte: "En 2 minutes, voici tout ce que vous pouvez faire. Vous pourrez passer à tout moment." },
      { ico: "📊", titre: "Votre tableau de bord", texte: "L'essentiel en un coup d'œil : effectifs, absences du jour, échéances à venir et demandes en attente." },
      { ico: "👥", titre: "Vos salariés", texte: "Toutes les fiches au même endroit.", points: ["Ajouter un salarié ou importer un fichier Excel", "Arrivées, départs et mouvements", "Registre unique du personnel prêt à imprimer", "Services et organigramme"] },
      { ico: "🏖️", titre: "Temps et absences", texte: "Plus de tableurs à tenir.", points: ["Congés, absences et soldes calculés", "Relevés d'heures et badgeuse", "Validation en un clic"] },
      { ico: "📂", titre: "Documents et contrats", texte: "Générés pour vous, rangés automatiquement.", points: ["Contrats et avenants", "Courriers RH prêts à l'emploi", "Livret d'accueil", "Échéances : période d'essai, CDD, visites médicales"] },
      { ico: "💶", titre: "La paie", texte: "Transmettez les variables du mois (heures, primes, frais, acomptes) : Franeo prépare la paie et dépose les bulletins à vos salariés." },
      { ico: "🗣️", titre: "Entretiens et suivi", texte: "Entretiens annuels et professionnels avec modèles, suivi médical et accidents du travail." },
      { ico: "🎫", titre: "Votre gestionnaire Franeo", texte: "Une question RH, un recrutement, un audit ? Faites une demande : votre gestionnaire vous répond dans l'app." },
      { ico: "📱", titre: "L'espace salarié", texte: "Vos salariés posent leurs congés, notes de frais et questions depuis leur téléphone. Vous validez, ils sont prévenus." },
      { ico: "🚀", titre: "C'est parti !", texte: "Le menu en haut vous donne accès à tout. L'assistant en bas à droite répond à vos questions à tout moment." },
    ],
  },
  salarie: {
    titre: "Bienvenue dans votre espace salarié",
    etapes: [
      { ico: "👋", titre: "Bienvenue !", texte: "Votre espace salarié rassemble tout ce qui vous concerne. Voici l'essentiel en 1 minute." },
      { ico: "🌴", titre: "Vos congés et absences", texte: "Consultez votre solde, posez un congé ou déclarez un arrêt : votre responsable est prévenu tout de suite." },
      { ico: "⏱️", titre: "Vos heures", texte: "Remplissez votre relevé d'heures ou pointez avec le badge, directement depuis votre téléphone." },
      { ico: "🧾", titre: "Vos notes de frais", texte: "Prenez le justificatif en photo, indiquez le montant : c'est envoyé pour validation." },
      { ico: "📄", titre: "Vos documents", texte: "Bulletins de paie, contrat, attestations : tout est disponible et téléchargeable à tout moment." },
      { ico: "💬", titre: "Une question ?", texte: "Posez vos questions à votre manager ou aux RH, et retrouvez les actualités de l'entreprise." },
      { ico: "📲", titre: "Sur votre téléphone", texte: "Installez l'app sur l'écran d'accueil de votre téléphone pour y accéder en un geste." },
    ],
  },
  manager: {
    titre: "Bienvenue dans votre espace manager",
    etapes: [
      { ico: "👋", titre: "Bienvenue !", texte: "En plus de votre espace salarié, vous gérez votre équipe. Voici comment en 1 minute." },
      { ico: "👥", titre: "Votre équipe", texte: "Voyez qui est présent, en congé ou absent, et le planning des congés de l'équipe." },
      { ico: "✅", titre: "Validez en un clic", texte: "Congés, absences, relevés d'heures et notes de frais de votre équipe arrivent chez vous : acceptez ou refusez, le salarié est prévenu." },
      { ico: "💬", titre: "Les questions de l'équipe", texte: "Répondez aux questions de vos collaborateurs. Si besoin, transmettez aux RH." },
      { ico: "🙋", titre: "Votre propre espace", texte: "Vous gardez vos congés, heures, frais et documents personnels, comme tout salarié." },
      { ico: "🚀", titre: "C'est parti !", texte: "Les demandes en attente s'affichent en haut de votre espace : rien ne vous échappe." },
    ],
  },
  cabinet: {
    titre: "Bienvenue dans votre espace cabinet",
    etapes: [
      { ico: "👋", titre: "Bienvenue !", texte: "Un seul accès pour tous vos dossiers clients. Voici l'essentiel en 1 minute." },
      { ico: "🗂️", titre: "Votre portefeuille", texte: "Tous vos clients sur une page, avec leurs alertes : variables de paie à saisir, échéances, demandes en attente." },
      { ico: "🏢", titre: "Ouvrir un dossier", texte: "Cliquez sur un client pour entrer dans son espace : salariés, absences, paie, documents. Changez de dossier en un clic." },
      { ico: "💶", titre: "La paie de vos clients", texte: "Variables, absences et relevés de tous vos clients centralisés : moins de relances, moins d'erreurs." },
      { ico: "👥", titre: "Vos collaborateurs", texte: "Ajoutez vos collaborateurs et choisissez les dossiers et les droits de chacun." },
      { ico: "🚀", titre: "C'est parti !", texte: "Votre gestionnaire Franeo reste disponible pour toute question." },
    ],
  },
};
