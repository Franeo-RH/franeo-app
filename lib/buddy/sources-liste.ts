// lib/buddy/sources-liste.ts
// Réponses paramétrées (Admin › Questions Buddy) de type « chercher dans l'app » : ce que Buddy va lire.
// (Fichier sans base de données : utilisable dans la page admin.)

export const SOURCES_BUDDY: { code: string; label: string; aide: string }[] = [
  { code: "recherche", label: "🔎 Chercher partout (pages, FAQ, actualités)", aide: "Buddy cherche la page, la FAQ ou l'actualité qui correspond à la question." },
  { code: "conges", label: "🌴 Soldes de congés", aide: "Solde du salarié cité, sinon de toute l'équipe." },
  { code: "absences", label: "🏖️ Absences", aide: "Absences du salarié cité, de la semaine, du mois…" },
  { code: "salaries", label: "👥 Salariés", aide: "Fiche du salarié cité, sinon la liste." },
  { code: "echeances", label: "⏰ Échéances", aide: "Visites médicales, titres de séjour, fins de contrat…" },
  { code: "variables", label: "✏️ Variables de paie", aide: "Primes, heures supplémentaires du mois." },
  { code: "paie", label: "💶 Récapitulatif de paie", aide: "Situation de la paie du mois." },
  { code: "accidents", label: "🩹 Accidents du travail", aide: "Dossiers en cours et prochaine échéance (DAT, questionnaire CPAM)." },
  { code: "facturation", label: "🧾 Facturation", aide: "Montant du mois et factures." },
  { code: "abonnements", label: "📦 Abonnements", aide: "Formules RH et paie souscrites." },
  { code: "tickets", label: "🎫 Tickets RH", aide: "Tickets ouverts et leur statut." },
  { code: "projets", label: "📐 Projets", aide: "Projets en cours, alertes, rentabilité." },
  { code: "actus", label: "📢 Actualités RH", aide: "Actualité qui correspond à la question." },
  { code: "faq", label: "❓ FAQ", aide: "Question de la FAQ la plus proche." },
];

export const libelleSource = (code: string | null | undefined) => SOURCES_BUDDY.find((s) => s.code === code)?.label ?? null;
