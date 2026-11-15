// lib/textes-formules.ts
// Textes des formules vus par les clients : la grille par défaut (lib/grille.ts),
// remplacée formule par formule par les textes modifiés par l'admin (table TexteFormule).

import { prisma } from "@/lib/prisma";
import { detailPaie, detailRH, GRILLE_PAIE, MENTION_VISITE_MEDICALE } from "@/lib/grille";

export type TexteAffiche = { message: string; lignes: string[]; modifie: boolean };

export const cleRH = (nom: string) => `rh:${nom.trim().toLowerCase()}`;
export const clePaie = (code: string) => `paie:${code}`;
export const CLE_MENTION = "mention";

/** Tous les textes modifiés par l'admin */
export async function textesModifies() {
  const l = await prisma.texteFormule.findMany().catch(() => []);
  return new Map(l.map((t) => [t.cle, t]));
}

type Modifs = Awaited<ReturnType<typeof textesModifies>>;

/** Formule RH : accroche + lignes « ✓ » (par défaut : celles de la formule en base) */
export function texteRH(m: Modifs, formule: { nom: string; features: string[] }): TexteAffiche {
  const t = m.get(cleRH(formule.nom));
  return {
    message: t?.message ?? detailRH(formule.nom)?.message ?? "",
    lignes: t && t.lignes.length ? t.lignes : formule.features,
    modifie: !!t,
  };
}

/** Formule paie : accroche + lignes (« € … » = option payante, « ✦ … » = intertitre) */
export function textePaie(m: Modifs, code: string): TexteAffiche {
  const t = m.get(clePaie(code));
  const g = GRILLE_PAIE.find((x) => x.code === code);
  const defaut = g ? [...g.features, ...g.options.map((o) => `€ ${o}`)] : [];
  const d = detailPaie(code) as { message?: string } | null | undefined;
  return {
    message: t?.message ?? d?.message ?? "",
    lignes: t && t.lignes.length ? t.lignes : defaut,
    modifie: !!t,
  };
}

/** Mention affichée sous les formules (visites médicales) */
export function texteMention(m: Modifs): TexteAffiche {
  const t = m.get(CLE_MENTION);
  return { message: t?.message ?? MENTION_VISITE_MEDICALE, lignes: [], modifie: !!t };
}
