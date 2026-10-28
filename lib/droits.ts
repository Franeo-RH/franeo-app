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
  { id: "salaries.creer", module: "salaries", label: "Ajouter des salariés" },
  { id: "salaries.modifier", module: "salaries", label: "Modifier les salariés" },
  { id: "salaries.supprimer", module: "salaries", label: "Supprimer des salariés" },
  { id: "salaries.importer", module: "salaries", label: "Importer des salariés (Excel)" },
  { id: "paie.variables", module: "paie", label: "Saisir des variables de paie" },
  { id: "paie.absences", module: "paie", label: "Déclarer des absences" },
  { id: "global.exports", module: "global", label: "Exporter en Excel" },
] as const;

export type ActionId = (typeof ACTIONS)[number]["id"];

/** Le client a-t-il le droit de faire cette action ? */
export function aDroit(permissions: string[] | null | undefined, action: ActionId): boolean {
  const perms = permissions || [];
  const module = action.split(".")[0];
  if (module !== "global" && !perms.includes(module)) return false;
  return !perms.includes(`-${action}`);
}

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
