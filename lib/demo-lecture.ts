// lib/demo-lecture.ts
// Démo en consultation seule : les visiteurs voient toutes les pages, mais ne peuvent ni modifier ni télécharger.
// Règle partagée par le proxy (serveur) et par le garde affiché dans le navigateur.

export const COOKIE_DEMO = "franeo_demo";
export const MESSAGE_DEMO = "Démo en consultation : vous pouvez tout visiter, mais les modifications et les téléchargements sont désactivés. Demandez votre accès pour utiliser l'application.";

/** Actions toujours permises dans la démo (connexion, déconnexion, Buddy, « J'ai lu », demande d'accès) */
const AUTORISES = [/^\/api\/logout/, /^\/api\/demo/, /^\/api\/auth(\/|$)/, /^\/api\/buddy(\/|$)/, /^\/api\/inscriptions(\/|$)/, /^\/api\/communications\/[^/]+\/lu$/, /^\/api\/suspendu\//, /^\/api\/cabinet\/client$/];

/** Téléchargements (fichiers Excel, CSV, PDF, Word, pièces jointes, exports) */
const TELECHARGEMENTS = [
  /^\/api\/(admin\/)?export(\/|$)/, /^\/api\/facturation\/recap/, /^\/api\/fichier-excel/, /^\/api\/hr\/indicators\/export/, /^\/api\/pj\//, /^\/api\/rgpd\//,
  /^\/api\/salaries\/import\/modele/, /^\/api\/espace-salarie\/export/, /^\/api\/documents\/[^/]+$/, /^\/api\/contrats\/trames\/[^/]+$/,
];

/** La requête est-elle refusée dans la démo ? */
export function bloqueeEnDemo(methode: string, chemin: string, recherche = ""): boolean {
  const m = methode.toUpperCase();
  if (m !== "GET" && m !== "HEAD") return chemin.startsWith("/api/") && !AUTORISES.some((r) => r.test(chemin));
  if (TELECHARGEMENTS.some((r) => r.test(chemin))) return true;
  return /[?&]format=(csv|xlsx|pdf)\b/.test(recherche);
}
