// Lecture d'un mois "AAAA-MM" dans l'adresse (par défaut : le mois en cours, heure de Paris)
export function moisDepuisParam(v: string | undefined | null): { mois: number; annee: number; valeur: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(v || "");
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return { annee: Number(m[1]), mois: Number(m[2]), valeur: v! };
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit" }).format(new Date());
  const [annee, mois] = p.split("-").map(Number);
  return { annee, mois, valeur: `${annee}-${String(mois).padStart(2, "0")}` };
}

export const NOMS_MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
