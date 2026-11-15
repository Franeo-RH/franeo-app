// lib/perimetre.ts
// Accès « dirigeant d'établissement » : un compte client rattaché à un établissement ne voit que
// les salariés de cet établissement (champ Salarie.etablissement) et les projets de cet établissement.
// Le dirigeant général (compte sans établissement) voit tout.
// Usage dans une requête : where: { entrepriseId, ...filtreSalaries(session) }

import type { ActionId } from "./droits";

/** Ce qu'un dirigeant d'établissement ne peut jamais faire (réservé au dirigeant général) */
export const RETIRES_ETABLISSEMENT: ActionId[] = [
  "entreprise.modifier", "entreprise.factures", "entreprise.abonnements", "entreprise.supplements", "entreprise.devis",
  "global.couts", "rh.services", "paie.cloture", "paie.import", "salaries.importer",
];

export type Perimetre = { etablissementId?: string | null; etablissement?: { id: string; nom: string } | null } | null | undefined;

/** Établissement auquel le compte est limité (null = voit toute l'entreprise) */
export function etablissementDe(s: Perimetre): { id: string; nom: string } | null {
  return s?.etablissementId && s.etablissement ? s.etablissement : null;
}

export const estDirigeantEtablissement = (s: Perimetre) => !!etablissementDe(s);

const egal = (nom: string) => ({ equals: nom, mode: "insensitive" as const });

/** Filtre sur le modèle Salarie */
export function filtreSalaries(s: Perimetre): { etablissement?: { equals: string; mode: "insensitive" } } {
  const e = etablissementDe(s);
  return e ? { etablissement: egal(e.nom) } : {};
}

/** Filtre sur un modèle relié à un salarié (Absence, VariablePaie, ReleveMois, Pointage, NoteFrais, RappelSalarie, Document…) */
export function filtreViaSalarie(s: Perimetre): { salarie?: { etablissement: { equals: string; mode: "insensitive" } } } {
  const e = etablissementDe(s);
  return e ? { salarie: { etablissement: egal(e.nom) } } : {};
}

/** Filtre sur le modèle Projet */
export function filtreProjets(s: Perimetre): { etablissementId?: string } {
  const e = etablissementDe(s);
  return e ? { etablissementId: e.id } : {};
}

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

/** Ce salarié est-il visible par ce compte ? (à vérifier après un findUnique) */
export function salarieVisible(s: Perimetre, salarie: { etablissement?: string | null } | null | undefined): boolean {
  const e = etablissementDe(s);
  return !e || (!!salarie && norm(salarie.etablissement) === norm(e.nom));
}

/** Ce projet est-il visible par ce compte ? */
export function projetVisible(s: Perimetre, projet: { etablissementId?: string | null } | null | undefined): boolean {
  const e = etablissementDe(s);
  return !e || (!!projet && projet.etablissementId === e.id);
}
