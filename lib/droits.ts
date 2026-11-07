// lib/droits.ts
// Droits d'un client, réglés par l'admin dans la fiche entreprise (bloc « Accès & droits »).
// Stockage dans Entreprise.permissions :
//   - un module activé :  "salaries", "paie", "tickets", "absences", "entreprise", "helpdesk"
//   - une action retirée : "-salaries.creer" (par défaut, toute action d'un module activé est permise)

export const MODULES = [
  { id: "salaries", label: "👥 Gestion RH (salariés)" },
  { id: "paie", label: "💰 Paie" },
  { id: "absences", label: "🏖️ Absences" },
  { id: "tickets", label: "🎫 Tickets RH" },
  { id: "helpdesk", label: "🆘 Helpdesk" },
  { id: "entreprise", label: "🏢 Mon entreprise (infos, abonnements, factures)" },
  { id: "espace-salaries", label: "📱 Espace salarié (option)" },
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
  { id: "rh.services", module: "salaries", label: "Organiser les services et l'organigramme" },
  { id: "rh.documents", module: "salaries", label: "Déposer et consulter les documents des salariés" },
  { id: "rh.contrats", module: "salaries", label: "Générer des contrats depuis un modèle (à partir de Sérénité)" },
  { id: "rh.frais", module: "espace-salaries", label: "Gestion RH : valider les notes de frais" },
  { id: "rh.questions", module: "espace-salaries", label: "Gestion RH : répondre aux questions des salariés" },
  // Absences
  { id: "paie.absences", module: "absences", label: "Déclarer des absences" },
  { id: "absences.valider", module: "absences", label: "Valider / refuser les absences des salariés" },
  // Paie
  { id: "paie.variables", module: "paie", label: "Saisir des variables de paie" },
  { id: "paie.tableau-bord", module: "paie", label: "Voir le tableau de bord paie (masse salariale)" },
  { id: "paie.releves", module: "espace-salaries", label: "Gestion RH : voir, valider et annuler les relevés (RMA)" },
  { id: "paie.historique", module: "paie", label: "Voir l'historique de paie" },
  { id: "paie.import", module: "paie", label: "Importer des variables en masse" },
  { id: "paie.cloture", module: "paie", label: "Demander la clôture / réouverture du mois" },
  // Tickets RH
  { id: "tickets.creer", module: "tickets", label: "Ouvrir des tickets RH" },
  { id: "tickets.recrutement", module: "tickets", label: "Demander un recrutement" },
  { id: "tickets.questions", module: "tickets", label: "Poser des questions RH ponctuelles" },
  // Mon entreprise
  { id: "entreprise.modifier", module: "entreprise", label: "Modifier les informations de l'entreprise" },
  { id: "entreprise.factures", module: "entreprise", label: "Voir les factures" },
  { id: "entreprise.abonnements", module: "entreprise", label: "Voir et demander un changement d'abonnement" },
  { id: "entreprise.supplements", module: "entreprise", label: "Voir les suppléments du mois" },
  { id: "entreprise.devis", module: "entreprise", label: "Faire des demandes (autres apps, audit, formation, devis)" },
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
  { prefixe: "/client/salaries/releves", droit: "paie.releves" },
  { prefixe: "/client/salaries/services", droit: "rh.services" },
  { prefixe: "/client/salaries/documents", droit: "rh.documents" },
  { prefixe: "/client/salaries/contrats", droit: "rh.contrats" },
  { prefixe: "/client/salaries/frais", droit: "rh.frais" },
  { prefixe: "/client/salaries/questions", droit: "rh.questions" },
  { prefixe: "/client/paie/import", droit: "paie.import" },
  { prefixe: "/client/paie/journal", droit: "paie.historique" },
  { prefixe: "/client/paie/controle", droit: "paie.variables" },
  { prefixe: "/client/tickets/historique", droit: "tickets.creer" },
  { prefixe: "/client/paie/historique", droit: "paie.historique" },
  { prefixe: "/client/tickets/nouveau", droit: "tickets.creer" },
  { prefixe: "/client/tickets/recrutement", droit: "tickets.recrutement" },
  { prefixe: "/client/tickets/questions", droit: "tickets.questions" },
  { prefixe: "/client/tickets/audit", droit: "tickets.creer" },
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

/**
 * Ajout de salarié par un client : validé par FRANEO RH seulement avec une formule paie.
 * Sans formule paie, le client gère ses salariés en autonomie.
 */
export function ajoutParValidation(entreprise: { demo?: boolean; abonnementPaieId?: string | null } | null | undefined): boolean {
  return passeParValidation(entreprise);
}

/** Niveau de la formule RH : 0 aucune, 1 Basic, 2 Essentiel, 3 Sérénité, 4 Premium */
export function niveauRH(entreprise: { abonnement?: { nom: string } | null } | null | undefined): number {
  const n = (entreprise?.abonnement?.nom || "").toLowerCase();
  if (n.includes("premium")) return 4;
  if (n.includes("sérénité") || n.includes("serenite")) return 3;
  if (n.includes("essentiel")) return 2;
  if (n.includes("basic")) return 1;
  return 0;
}

/**
 * Onglet Paie : formule paie souscrite, ou formule RH Sérénité / Premium (saisie des informations de paie),
 * et module « paie » activé.
 */
export function aAccesPaie(entreprise: { permissions?: string[] | null; abonnementPaieId?: string | null; abonnement?: { nom: string } | null } | null | undefined): boolean {
  return !!entreprise && (entreprise.permissions || []).includes("paie") && (!!entreprise.abonnementPaieId || niveauRH(entreprise) >= 3);
}

/** Contrats générés depuis un modèle : à partir de RH Sérénité (ou avec une formule paie) */
export function aAccesContrats(entreprise: { permissions?: string[] | null; abonnementPaieId?: string | null; abonnement?: { nom: string } | null } | null | undefined): boolean {
  return !!entreprise && aDroit(entreprise.permissions, "rh.contrats") && (niveauRH(entreprise) >= 3 || !!entreprise.abonnementPaieId);
}

// ── Accès par formule (bloc « Accès & droits » de l'admin) ──
export const ACCES_FORMULES = [
  { id: "BASIC", label: "Basic", detail: "Salariés (ajout, modif, import, suppression), mouvements, absences. Pas d'échéances, pas de question RH simple, pas de paie. Tickets à 70 €." },
  { id: "ESSENTIEL", label: "Essentiel", detail: "Basic + 3 tickets RH, échéances complètes, conseil RH ponctuel illimité." },
  { id: "SERENITE", label: "Sérénité", detail: "Essentiel + 5 tickets RH, saisie des informations de paie, contrats depuis modèle." },
  { id: "PREMIUM", label: "Premium", detail: "Sérénité + 10 tickets RH, saisie des informations de paie, Franeo Analytics sur demande." },
  { id: "PERSO", label: "Personnalisé", detail: "Vous cochez vous-même chaque onglet et chaque action." },
] as const;

/** Droits d'une formule. L'espace salarié reste une option (conservée si elle était déjà activée). */
export function permissionsFormule(niveau: string, actuelles: string[] = [], avecFormulePaie = false): string[] {
  const base = ["salaries", "absences", "tickets", "helpdesk", "entreprise"];
  const retirer: ActionId[] = [];
  if (niveau === "BASIC") retirer.push("salaries.echeances", "salaries.echeances-modifier", "tickets.questions", "rh.contrats", "rh.documents");
  if (niveau === "ESSENTIEL") retirer.push("rh.contrats");
  const modules = niveau === "SERENITE" || niveau === "PREMIUM" || avecFormulePaie ? [...base, "paie"] : base;
  const garder = actuelles.filter((p) => p === "espace-salaries");
  return [...modules, ...garder, ...retirer.map((a) => `-${a}`), `@acces:${niveau}`];
}

export const accesChoisi = (permissions: string[] | null | undefined) => (permissions || []).find((p) => p.startsWith("@acces:"))?.slice(7) ?? null;
