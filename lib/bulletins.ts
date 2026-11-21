// lib/bulletins.ts
// Bulletins de paie : déposés par FRANEO RH (Admin › Paie › Bulletins), lus par le salarié et l'employeur.

export const MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Salarié correspondant à un nom de fichier (matricule, ou nom + prénom présents dans le nom) */
export function salarieDuFichier<T extends { id: string; nom: string; prenom: string; matricule?: string | null }>(fichier: string, salaries: T[]): T | null {
  const f = ` ${norm(fichier.replace(/\.pdf$/i, ""))} `;
  const parMatricule = salaries.find((s) => s.matricule && f.includes(` ${norm(s.matricule)} `));
  if (parMatricule) return parMatricule;
  const candidats = salaries.filter((s) => f.includes(` ${norm(s.nom)} `) && (f.includes(` ${norm(s.prenom)} `) || salaries.filter((x) => norm(x.nom) === norm(s.nom)).length === 1));
  return candidats.length === 1 ? candidats[0] : null;
}
