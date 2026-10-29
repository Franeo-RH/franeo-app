// Outils du relevé d'heures (utilisables côté serveur et navigateur)

/** "2026-10-28" → Date à midi UTC (évite les décalages de fuseau) */
export function jourUTC(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date → "2026-10-28" */
export function isoJour(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}

/** Lundi de la semaine contenant ce jour, au format ISO */
export function lundiDe(iso: string): string {
  const d = jourUTC(iso) ?? new Date();
  const decalage = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - decalage);
  return isoJour(d);
}

/** Les 7 jours (ISO) d'une semaine commençant le lundi donné */
export function joursSemaine(lundi: string): string[] {
  const d = jourUTC(lundi)!;
  return Array.from({ length: 7 }, (_, i) => {
    const j = new Date(d);
    j.setUTCDate(d.getUTCDate() + i);
    return isoJour(j);
  });
}

/** Lit "7,5", "7.5", "7h30" ou "7:30" → 7.5 ; vide → null */
export function lireHeures(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const t = String(v).trim().toLowerCase().replace(",", ".");
  if (!t) return null;
  const m = t.match(/^(\d{1,2})\s*[h:]\s*(\d{1,2})?$/);
  const n = m ? Number(m[1]) + (m[2] ? Number(m[2]) / 60 : 0) : Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 24) return NaN;
  return Math.round(n * 100) / 100;
}

export const fmtH = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} h`;

/** Tous les jours (ISO) d'un mois */
export function joursDuMois(mois: number, annee: number): string[] {
  const n = new Date(Date.UTC(annee, mois, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => isoJour(new Date(Date.UTC(annee, mois - 1, i + 1, 12))));
}

export const NOMS_MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export const STATUTS_RELEVE: Record<string, { fond: string; texte: string; libelle: string }> = {
  Brouillon: { fond: "#f3f4f6", texte: "#374151", libelle: "📝 Brouillon (modifiable)" },
  "Envoyé": { fond: "#fff7ed", texte: "#c2410c", libelle: "📤 Envoyé, en attente de validation" },
  "Validé": { fond: "#dcfce7", texte: "#15803d", libelle: "✅ Validé" },
  "Refusé": { fond: "#fee2e2", texte: "#b91c1c", libelle: "↩️ Refusé, à corriger" },
};

export type JourReleve = { date: string; heures: number | null; heuresSupp: number; commentaire: string | null; teletravail?: boolean };
export type AbsenceReleve = { type: string; dateDebut: string; dateFin: string; statut: string };
