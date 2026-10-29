// lib/droits.ts
// Droits d'un client, réglés par l'admin dans la fiche entreprise (bloc « Accès & droits »).
// Stockage dans Entreprise.permissions :
//   - un module activé :  "salaries", "paie", "tickets", "absences", "entreprise", "helpdesk"
//   - une action retirée : "-salaries.creer" (par défaut, toute action d'un module activé est permise)

export const MODULES = [
  { id: "salaries", label: "👥 Salariés" },
  { id: "paie", label: "💰 Paie" },
  { id: "absences", label: "🏖️ Absences" },
  { id: "tickets", label: "🎫 Tickets RH" },
  { id: "helpdesk", label: "🆘 Helpdesk" },
  { id: "entreprise", label: "🏢 Mon entreprise (infos, abonnements, factures)" },
  { id: "espace-salaries", label: "📱 Espace salarié (option : 1 €/salarié/mois, inclus en Premium et Entreprise)" },
] as const;

export const ACTIONS = [
  // Salariés
  { id: "salaries.creer", module: "salaries", label: "Ajouter des salariés (sur demande)" },
  { id: "salaries.modifier", module: "salaries", label: "Modifier les salariés" },
  { id: "salaries.supprimer", module: "salaries", label: "Supprimer des salariés" },
  { id: "salaries.importer", module: "salaries", label: "Importer des salariés (Excel)" },
  { id: "salaries.salaires", module: "salaries", label: "Voir les salaires et données sensibles (n° SS…)" },
  { id: "salaries.mouvements", module: "salaries", label: "Voir les mouvements (entrées / sorties)" },
  { id: "salaries.echeances", module: "salaries", label: "Voir les échéances" },
  { id: "salaries.echeances-modifier", module: "salaries", label: "Ajouter / modifier des échéances" },
  { id: "salaries.demandes", module: "salaries", label: "Voir ses demandes de validation" },
  // Absences
  { id: "paie.absences", module: "absences", label: "Déclarer des absences" },
  { id: "absences.valider", module: "absences", label: "Valider / refuser les absences des salariés" },
  // Paie
  { id: "paie.variables", module: "paie", label: "Saisir des variables de paie" },
  { id: "paie.tableau-bord", module: "paie", label: "Voir le tableau de bord paie (masse salariale)" },
  { id: "paie.releves", module: "paie", label: "Voir et valider les relevés d'heures" },
  { id: "paie.historique", module: "paie", label: "Voir l'historique de paie" },
  // Tickets RH
  { id: "tickets.creer", module: "tickets", label: "Ouvrir des tickets RH" },
  { id: "tickets.recrutement", module: "tickets", label: "Demander un recrutement" },
  { id: "tickets.questions", module: "tickets", label: "Poser des questions RH ponctuelles" },
  // Mon entreprise
  { id: "entreprise.modifier", module: "entreprise", label: "Modifier les informations de l'entreprise" },
  { id: "entreprise.factures", module: "entreprise", label: "Voir les factures" },
  { id: "entreprise.abonnements", module: "entreprise", label: "Voir et demander un changement d'abonnement" },
  { id: "entreprise.supplements", module: "entreprise", label: "Voir les suppléments du mois" },
  { id: "entreprise.devis", module: "entreprise", label: "Demander des devis" },
  // Espace salarié : ce que les salariés voient dans leur espace
  { id: "espace.gerer", module: "espace-salaries", label: "Le client gère les accès de ses salariés" },
  { id: "espace.absences", module: "espace-salaries", label: "Salariés : demander leurs absences" },
  { id: "espace.heures", module: "espace-salaries", label: "Salariés : relevé d'heures" },
  { id: "espace.echeances", module: "espace-salaries", label: "Salariés : voir leurs échéances" },
  { id: "espace.communications", module: "espace-salaries", label: "Salariés : voir les communications" },
  // Partout
  { id: "global.exports", module: "global", label: "Exporter en Excel" },
  { id: "global.couts", module: "global", label: "Voir les coûts Franeo sur le tableau de bord" },
] as const;

export type ActionId = (typeof ACTIONS)[number]["id"];

/** Le client a-t-il le droit de faire cette action ? (module activé et action non retirée) */
export function aDroit(permissions: string[] | null | undefined, action: ActionId): boolean {
  const perms = permissions || [];
  const module = ACTIONS.find((a) => a.id === action)?.module ?? action.split(".")[0];
  if (module !== "global" && !perms.includes(module)) return false;
  return !perms.includes(`-${action}`);
}

/** Pages client protégées par un droit (le préfixe le plus long l'emporte) */
export const DROITS_PAGES: { prefixe: string; droit: ActionId }[] = [
  { prefixe: "/client/salaries/nouveau", droit: "salaries.creer" },
  { prefixe: "/client/salaries/import", droit: "salaries.importer" },
  { prefixe: "/client/salaries/mouvements", droit: "salaries.mouvements" },
  { prefixe: "/client/salaries/echeances", droit: "salaries.echeances" },
  { prefixe: "/client/salaries/demandes", droit: "salaries.demandes" },
  { prefixe: "/client/paie/saisie", droit: "paie.variables" },
  { prefixe: "/client/paie/releves", droit: "paie.releves" },
  { prefixe: "/client/paie/historique", droit: "paie.historique" },
  { prefixe: "/client/tickets/nouveau", droit: "tickets.creer" },
  { prefixe: "/client/tickets/recrutement", droit: "tickets.recrutement" },
  { prefixe: "/client/tickets/questions", droit: "tickets.questions" },
  { prefixe: "/client/entreprise/modifier", droit: "entreprise.modifier" },
  { prefixe: "/client/entreprise/facturation", droit: "entreprise.factures" },
  { prefixe: "/client/entreprise/abonnement", droit: "entreprise.abonnements" },
  { prefixe: "/client/abonnement-paie", droit: "entreprise.abonnements" },
  { prefixe: "/client/entreprise/supplements", droit: "entreprise.supplements" },
  { prefixe: "/client/entreprise/devis", droit: "entreprise.devis" },
];

export function droitPourChemin(chemin: string): ActionId | null {
  const r = DROITS_PAGES.filter((d) => chemin === d.prefixe || chemin.startsWith(d.prefixe + "/")).sort((a, b) => b.prefixe.length - a.prefixe.length)[0];
  return r?.droit ?? null;
}

/** Profils tout prêts proposés à l'admin */
export const PROFILS_DROITS: { id: string; label: string; retirer: ActionId[] }[] = [
  { id: "complet", label: "✅ Tout autoriser", retirer: [] },
  {
    id: "lecture",
    label: "👀 Lecture seule",
    retirer: ["salaries.creer", "salaries.modifier", "salaries.supprimer", "salaries.importer", "salaries.echeances-modifier", "paie.absences", "absences.valider", "paie.variables", "tickets.creer", "tickets.recrutement", "entreprise.modifier", "entreprise.devis", "espace.gerer"],
  },
  { id: "manager", label: "🧑‍💼 Manager (sans salaires ni factures)", retirer: ["salaries.salaires", "entreprise.factures", "entreprise.abonnements", "entreprise.supplements", "global.couts", "salaries.supprimer"] },
  { id: "comptable", label: "🧾 Comptable (paie et factures)", retirer: ["salaries.creer", "salaries.supprimer", "salaries.importer", "tickets.recrutement", "espace.gerer"] },
];

/** Client avec une formule paie : toute action sur un salarié passe par une demande de validation */
export function passeParValidation(entreprise: { abonnementPaieId?: string | null; demo?: boolean } | null | undefined): boolean {
  return !!entreprise && !!entreprise.abonnementPaieId && !entreprise.demo;
}

/** Tout ajout de salarié par un client (hors démo) passe par une demande validée par l'admin */
export function ajoutParValidation(entreprise: { demo?: boolean } | null | undefined): boolean {
  return !!entreprise && !entreprise.demo;
}

/** Le client voit l'onglet Paie seulement s'il a une formule paie (et le module activé) */
export function aAccesPaie(entreprise: { permissions?: string[] | null; abonnementPaieId?: string | null } | null | undefined): boolean {
  return !!entreprise && !!entreprise.abonnementPaieId && (entreprise.permissions || []).includes("paie");
}
