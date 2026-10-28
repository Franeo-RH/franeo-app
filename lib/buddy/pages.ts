// lib/buddy/pages.ts
// Pages de l'espace client que Buddy peut ouvrir ou recommander.
// Si vous renommez une page de l'application, changez-la ici.

export const PAGE = {
  dashboard: "/client/dashboard",
  salaries: "/client/salaries",
  salarieNouveau: "/client/salaries/nouveau",
  mouvements: "/client/salaries/mouvements",
  paie: "/client/paie",
  saisie: "/client/paie/saisie",
  absences: "/client/salaries/absences",
  historiquePaie: "/client/paie/historique",
  tickets: "/client/tickets",
  ticketNouveau: "/client/tickets/nouveau",
  recrutement: "/client/tickets/recrutement",
  recrutementHisto: "/client/tickets/recrutement/historique",
  helpdesk: "/client/helpdesk",
  helpdeskNouveau: "/client/helpdesk/nouveau",
  entreprise: "/client/entreprise",
  facturation: "/client/entreprise/facturation",
  abonnement: "/client/entreprise/abonnement",
  abonnementPaie: "/client/abonnement-paie",
  actualites: "/client/actualites",
  faq: "/client/faq",
  profil: "/client/profil",
} as const;

export type ClePage = keyof typeof PAGE;

/** Ce que Buddy comprend quand on lui dit « va sur … » (mots déjà sans accents). */
export const NAVIGATION: { cle: ClePage; label: string; mots: string[]; module: string }[] = [
  { cle: "salarieNouveau", label: "Nouveau salarié", mots: ["nouveau salarie", "ajouter un salarie", "creer un salarie"], module: "salaries" },
  { cle: "mouvements", label: "Mouvements du personnel", mots: ["mouvements", "entrees et sorties", "entrees sorties"], module: "salaries" },
  { cle: "salaries", label: "Salariés", mots: ["salaries", "salarie", "employes", "personnel", "effectif", "equipe"], module: "salaries" },
  { cle: "absences", label: "Absences", mots: ["absences", "absence", "conges", "calendrier des absences"], module: "absences" },
  { cle: "saisie", label: "Saisie des variables", mots: ["saisie", "variables", "variable", "primes", "saisie de paie"], module: "paie" },
  { cle: "historiquePaie", label: "Historique de paie", mots: ["historique de paie", "historique paie", "bulletins", "historique des variables"], module: "paie" },
  { cle: "paie", label: "Paie", mots: ["paie", "la paie"], module: "paie" },
  { cle: "recrutementHisto", label: "Historique des recrutements", mots: ["historique des recrutements", "historique recrutement", "mes recrutements"], module: "tickets" },
  { cle: "recrutement", label: "Recrutement", mots: ["recrutement", "recruter"], module: "tickets" },
  { cle: "ticketNouveau", label: "Nouveau ticket RH", mots: ["nouveau ticket", "creer un ticket"], module: "tickets" },
  { cle: "tickets", label: "Tickets RH", mots: ["tickets", "ticket", "tickets rh"], module: "tickets" },
  { cle: "helpdeskNouveau", label: "Nouveau ticket helpdesk", mots: ["nouveau ticket helpdesk", "nouvelle demande helpdesk"], module: "helpdesk" },
  { cle: "helpdesk", label: "Helpdesk", mots: ["helpdesk", "support", "assistance technique"], module: "helpdesk" },
  { cle: "facturation", label: "Facturation", mots: ["facturation", "factures", "facture"], module: "entreprise" },
  { cle: "abonnementPaie", label: "Abonnement paie", mots: ["abonnement paie", "formule paie", "formules paie"], module: "paie" },
  { cle: "abonnement", label: "Abonnement RH", mots: ["abonnement", "abonnement rh", "formule rh", "mon abonnement"], module: "entreprise" },
  { cle: "entreprise", label: "Mon entreprise", mots: ["entreprise", "mon entreprise", "societe", "fiche entreprise"], module: "entreprise" },
  { cle: "actualites", label: "Actualité RH", mots: ["actualites", "actualite", "actus", "actualite rh", "news"], module: "libre" },
  { cle: "faq", label: "FAQ", mots: ["faq", "foire aux questions"], module: "libre" },
  { cle: "profil", label: "Mon profil", mots: ["profil", "mon profil", "mon compte", "mot de passe"], module: "libre" },
  { cle: "dashboard", label: "Tableau de bord", mots: ["dashboard", "tableau de bord", "accueil", "page d accueil"], module: "libre" },
];
