// Les autres applications Franeo : liens, couleurs, logos et tarifs affichés dans la demande d'accès.
// Pour changer un prix ou une option, modifiez uniquement ce fichier.

export type FormuleApp = { nom: string; prix: number | null; unite?: string; details: string[] };
export type AppFraneo = {
  code: string;
  nom: string;
  description: string;
  url: string;
  couleur: string;
  fond: string;
  logo: string;
  formules: FormuleApp[];
  options: { libelle: string; prix: number | null; unite?: string }[];
};

export const APPS_FRANEO: AppFraneo[] = [
  {
    code: "JOBS",
    nom: "Franeo Jobs",
    description: "Vos offres d'emploi, les candidatures et les CV reçus au même endroit.",
    url: "https://jobs.franeo-rh.com/offres",
    couleur: "#8b10f0",
    fond: "#f5edff",
    logo: "/apps/jobs.png",
    formules: [
      { nom: "Accès client", prix: 0, details: ["Inclus avec chaque recrutement confié à FRANEO RH", "Suivi des candidatures et des CV", "Vivier de candidats"] },
    ],
    options: [
      { libelle: "Lancement d'un recrutement", prix: 400, unite: "par recrutement" },
      { libelle: "Primes au succès (signature + fin d'essai)", prix: null },
    ],
  },
  {
    code: "OPTIMZ",
    nom: "Franeo'ptimz",
    description: "Pilotage des contrats fournisseurs, échéances et économies.",
    url: "https://optimz.franeo-rh.com/dashboard",
    couleur: "#2a6fd6",
    fond: "#eaf2fd",
    logo: "/apps/optimz.png",
    formules: [
      { nom: "Essential", prix: 39, unite: "/mois", details: ["Jusqu'à 10 contrats", "Alertes d'échéances"] },
      { nom: "Business", prix: 99, unite: "/mois", details: ["Contrats illimités", "Comparateur et détection d'opportunités", "Score sur 100 et rapport mensuel", "Calculateur ROI"] },
    ],
    options: [
      { libelle: "Mission de négociation / mise en concurrence", prix: null },
    ],
  },
  {
    code: "TRAINING",
    nom: "Franeo Training",
    description: "Ressources, modules et suivi des formations FRANEO RH.",
    url: "https://training.franeo-rh.com/admin",
    couleur: "#17a34a",
    fond: "#e9f9ef",
    logo: "/apps/training.png",
    formules: [
      { nom: "Continuité", prix: 39, unite: "/mois", details: ["1 dirigeant + 2 utilisateurs inclus", "Ressources des formations suivies"] },
      { nom: "Expertise", prix: 79, unite: "/mois", details: ["Utilisateurs illimités", "Toutes les ressources, modèles et outils", "Questions / réponses et rendez-vous trimestriel"] },
    ],
    options: [
      { libelle: "Utilisateur supplémentaire (Continuité)", prix: 5, unite: "/mois" },
    ],
  },
  {
    code: "DATA",
    nom: "Franeo Data",
    description: "Vos exports Excel transformés en tableaux de bord (paie, RH, compta, ADV).",
    url: "https://data.franeo-rh.com/login",
    couleur: "#dc2018",
    fond: "#fdecec",
    logo: "/apps/data.png",
    formules: [
      { nom: "Essential", prix: 39, unite: "/mois", details: ["Tableaux de bord mensuels", "Imports Excel"] },
      { nom: "Business", prix: 99, unite: "/mois", details: ["Tous les services (paie, RH, compta, ADV)", "Indicateurs avancés"] },
    ],
    options: [],
  },
  {
    code: "CSE",
    nom: "Franeo CSE",
    description: "La plateforme des élus, des salariés et de l'employeur pour le CSE.",
    url: "https://cse.franeo-rh.com",
    couleur: "#9a6233",
    fond: "#f7efe6",
    logo: "/apps/cse.png",
    formules: [
      { nom: "Sur devis", prix: null, details: ["Gestion du CSE et de la BDESE", "Résumé des comptes-rendus"] },
    ],
    options: [],
  },
];

export const appFraneo = (code: string | null | undefined) => APPS_FRANEO.find((a) => a.code === code);

/** Remise sur les autres apps pour un client abonné RH ou Paie */
export const REMISE_APPS = 0.15;
/** Remise sur l'audit RH pour un client abonné RH ou Paie */
export const REMISE_AUDIT = 0.10;

export const estAbonne = (e: { abonnementId?: string | null; abonnementPaieId?: string | null } | null | undefined) =>
  !!e && (!!e.abonnementId || !!e.abonnementPaieId);

export const prixRemise = (prix: number, remise: number) => Math.round(prix * (1 - remise) * 100) / 100;

export const TYPES_DEMANDE: Record<string, { label: string; icone: string }> = {
  APP: { label: "Accès à une app", icone: "📱" },
  AUDIT: { label: "Audit RH", icone: "🔍" },
  FORMATION: { label: "Formation", icone: "🎓" },
  AUTRE: { label: "Autre demande", icone: "✍️" },
};

export const STATUTS_DEMANDE: Record<string, { label: string; fond: string; texte: string }> = {
  EN_ATTENTE: { label: "En attente", fond: "#fff7ed", texte: "#c2410c" },
  EN_COURS: { label: "En cours", fond: "#eff6ff", texte: "#1d4ed8" },
  TRAITEE: { label: "Traitée", fond: "#dcfce7", texte: "#15803d" },
  REFUSEE: { label: "Refusée", fond: "#fee2e2", texte: "#b91c1c" },
};

/** Modules de formation FRANEO RH */
export const MODULES_FORMATION = [
  "01 Recruter et préparer l'arrivée",
  "02 Entretien de recrutement",
  "03 Intégrer un nouveau collaborateur",
  "04 Comprendre la paie",
  "05 Comprendre les absences",
  "06 Gérer une absence",
  "07 Préparer le retour au travail",
  "08 Entretiens annuels",
  "09 Gérer une période d'essai",
];
