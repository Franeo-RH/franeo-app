// Calculs purs des indicateurs RH (sans base de données) : testables et réutilisés par l'API.

export const VIEW_HR_INDICATORS = "indicateurs-rh"; // permission (module) qui donne accès à l'onglet

export type Periode = { debut: Date; fin: Date };
export const CONTRATS_FILTRE = ["CDI", "CDD", "Alternant", "Stagiaire"] as const;

const JOUR = 86400000;
const minuit = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Période à partir d'un raccourci (aujourd'hui, ce mois…) ou de dates personnalisées */
export function periodeDepuis(cle: string | null, startDate?: string | null, endDate?: string | null, maintenant = new Date()): Periode {
  const a = maintenant.getFullYear();
  const m = maintenant.getMonth();
  const fin = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  switch (cle) {
    case "aujourdhui": return { debut: minuit(maintenant), fin: fin(maintenant) };
    case "mois-precedent": return { debut: new Date(a, m - 1, 1), fin: fin(new Date(a, m, 0)) };
    case "annee": return { debut: new Date(a, 0, 1), fin: fin(new Date(a, 11, 31)) };
    case "annee-precedente": return { debut: new Date(a - 1, 0, 1), fin: fin(new Date(a - 1, 11, 31)) };
    case "personnalisee": {
      const d = startDate ? new Date(startDate) : null;
      const f = endDate ? new Date(endDate) : null;
      if (d && f && !Number.isNaN(d.getTime()) && !Number.isNaN(f.getTime()) && f >= d) return { debut: minuit(d), fin: fin(f) };
      return { debut: new Date(a, m, 1), fin: fin(new Date(a, m + 1, 0)) };
    }
    default: return { debut: new Date(a, m, 1), fin: fin(new Date(a, m + 1, 0)) }; // ce mois
  }
}

/** Valeurs de typeContrat en base correspondant au filtre */
export function contratsBase(filtre: string | null): string[] | null {
  switch (filtre) {
    case "CDI": return ["CDI"];
    case "CDD": return ["CDD"];
    case "Alternant": return ["Alternance", "Apprentissage", "Contrat de professionnalisation", "Alternant"];
    case "Stagiaire": return ["Stage", "Stagiaire"];
    default: return null;
  }
}

export function familleContrat(t: string | null | undefined): "CDI" | "CDD" | "Alternant" | "Stagiaire" | "Autre" {
  const v = (t || "").toLowerCase();
  if (v === "cdi") return "CDI";
  if (v === "cdd") return "CDD";
  if (v.includes("altern") || v.includes("apprenti") || v.includes("professionnalisation")) return "Alternant";
  if (v.includes("stag")) return "Stagiaire";
  return "Autre";
}

/** Le salarié est-il présent (sous contrat) à cette date ? */
export function present(s: { dateDebut: Date | null; dateFin: Date | null }, d: Date): boolean {
  return (!s.dateDebut || s.dateDebut <= d) && (!s.dateFin || s.dateFin >= minuit(d));
}

/** Jours ouvrés (lundi-vendredi) entre deux dates incluses */
export function joursOuvres(debut: Date, fin: Date): number {
  let n = 0;
  for (let d = minuit(debut); d <= fin; d = new Date(d.getTime() + JOUR)) {
    const j = d.getDay();
    if (j !== 0 && j !== 6) n++;
    if (n > 4000) break;
  }
  return n;
}

/** Chevauchement d'une absence avec la période : jours calendaires et jours ouvrés */
export function chevauchement(a: { dateDebut: Date; dateFin: Date }, p: Periode) {
  const d = a.dateDebut > p.debut ? a.dateDebut : p.debut;
  const f = a.dateFin < p.fin ? a.dateFin : p.fin;
  if (f < d) return { calendaires: 0, ouvres: 0 };
  return { calendaires: Math.round((minuit(f).getTime() - minuit(d).getTime()) / JOUR) + 1, ouvres: joursOuvres(d, f) };
}

/** Mois couverts par la période (au plus 24), pour les graphiques et les variables de paie */
export function moisDeLaPeriode(p: Periode): { mois: number; annee: number; cle: string; libelle: string; debut: Date; fin: Date }[] {
  const res = [];
  let d = new Date(p.debut.getFullYear(), p.debut.getMonth(), 1);
  const NOMS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  while (d <= p.fin && res.length < 24) {
    const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    res.push({ mois: d.getMonth() + 1, annee: d.getFullYear(), cle: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, libelle: `${NOMS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, debut: d, fin });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return res;
}

/** Ancienneté en années à une date */
export function anciennete(dateDebut: Date | null, a: Date): number {
  if (!dateDebut || dateDebut > a) return 0;
  return (a.getTime() - dateDebut.getTime()) / (365.25 * JOUR);
}

export const arrondi = (n: number, c = 1) => Math.round(n * 10 ** c) / 10 ** c;
export const pct = (num: number, den: number) => (den > 0 ? arrondi((num / den) * 100, 1) : null);
