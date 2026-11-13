// lib/avantages.ts
// Avantages versés chaque mois par l'employeur (fiche entreprise) et leurs montants par salarié (fiche salarié).
// - Tickets restaurant : valeur faciale + part patronale (%) ; la part salariale est retenue sur le salaire.
// - Panier repas : montant par jour travaillé.
// - Autres (ex. transport, mutuelle, téléphone) : libellés choisis par l'entreprise, montant mensuel saisi dans la fiche du salarié.
// Utilisable côté navigateur (aucun accès à la base).

export type AvantagesEntreprise = {
  tr: { actif: boolean; valeur: number | null; partPatronale: number | null };
  panier: { actif: boolean; montant: number | null };
  autres: { actif: boolean; libelles: string[] };
};
export type AvantagesSalarie = {
  tr: boolean; panier: boolean;
  joursMois: number | null; // jours travaillés habituels par mois (sinon jours ouvrés du mois)
  autres: { libelle: string; montant: number }[];
};

export const AUTRES_SUGGERES = ["Transport (abonnement)", "Indemnité kilométrique", "Mutuelle (part employeur)", "Téléphone", "Télétravail", "Véhicule de fonction"];
export const PLAFOND_TR_2026 = 7.26; // part patronale exonérée maximale indicative par titre

const nb = (v: unknown) => (v === "" || v == null || !Number.isFinite(Number(v)) ? null : Math.round(Number(v) * 100) / 100);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export function lireAvantagesEntreprise(v: unknown): AvantagesEntreprise {
  const o = obj(v), tr = obj(o.tr), pa = obj(o.panier), au = obj(o.autres);
  return {
    tr: { actif: !!tr.actif, valeur: nb(tr.valeur), partPatronale: nb(tr.partPatronale) ?? 50 },
    panier: { actif: !!pa.actif, montant: nb(pa.montant) },
    autres: { actif: !!au.actif, libelles: Array.isArray(au.libelles) ? [...new Set(au.libelles.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().slice(0, 60)))].slice(0, 12) : [] },
  };
}

/** Par défaut, un salarié bénéficie des TR / paniers que l'entreprise verse */
export function lireAvantagesSalarie(v: unknown, e: AvantagesEntreprise): AvantagesSalarie {
  const o = obj(v);
  const autres = Array.isArray(o.autres) ? o.autres.map(obj).map((x) => ({ libelle: String(x.libelle ?? "").trim().slice(0, 60), montant: nb(x.montant) ?? 0 })).filter((x) => x.libelle && x.montant > 0) : [];
  return {
    tr: e.tr.actif && o.tr !== false,
    panier: e.panier.actif && o.panier !== false,
    joursMois: nb(o.joursMois),
    autres: autres.filter((x) => e.autres.actif && e.autres.libelles.includes(x.libelle)),
  };
}

export type EstimationAvantages = { jours: number; trEmployeur: number; trSalarie: number; panier: number; autres: number; totalEmployeur: number };

/** Montants du mois pour un salarié (jours = jours travaillés retenus) */
export function estimerAvantages(e: AvantagesEntreprise, s: AvantagesSalarie, jours: number): EstimationAvantages {
  const r = (n: number) => Math.round(n * 100) / 100;
  const j = Math.max(0, jours);
  const valeur = e.tr.valeur ?? 0, part = (e.tr.partPatronale ?? 50) / 100;
  const trEmployeur = s.tr ? r(j * valeur * part) : 0;
  const trSalarie = s.tr ? r(j * valeur * (1 - part)) : 0;
  const panier = s.panier ? r(j * (e.panier.montant ?? 0)) : 0;
  const autres = r(s.autres.reduce((t, x) => t + x.montant, 0));
  return { jours: j, trEmployeur, trSalarie, panier, autres, totalEmployeur: r(trEmployeur + panier + autres) };
}

/** Jours ouvrés (lun.–ven.) d'un mois */
export function joursOuvresMois(mois: number, annee: number): number {
  let n = 0;
  const fin = new Date(annee, mois, 0).getDate();
  for (let d = 1; d <= fin; d++) { const j = new Date(annee, mois - 1, d).getDay(); if (j !== 0 && j !== 6) n++; }
  return n;
}

export const aDesAvantages = (e: AvantagesEntreprise) => e.tr.actif || e.panier.actif || (e.autres.actif && e.autres.libelles.length > 0);
