// lib/trames-entretien.ts
// Trame du compte rendu d'entretien : celle du client si elle existe, sinon le modèle FRANEO, sinon la trame par défaut.

import { prisma } from "@/lib/prisma";
import { TRAME_ENTRETIEN, TYPES_ENTRETIEN } from "@/lib/entretiens";

export type Rubrique = { cle: string; label: string };

export const trameParDefaut = (type: string): Rubrique[] =>
  TRAME_ENTRETIEN.filter((t) => !t.types || t.types.includes(type)).map(({ cle, label }) => ({ cle, label }));

export function nettoyerRubriques(v: unknown): Rubrique[] {
  if (!Array.isArray(v)) return [];
  const vues = new Set<string>();
  const out: Rubrique[] = [];
  for (const r of v.slice(0, 40)) {
    const label = typeof r?.label === "string" ? r.label.trim().slice(0, 200) : "";
    if (!label) continue;
    let cle = typeof r?.cle === "string" && /^[a-z0-9_]{1,40}$/.test(r.cle) ? r.cle : label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "rubrique";
    while (vues.has(cle)) cle = `${cle.slice(0, 36)}_${out.length}`;
    vues.add(cle);
    out.push({ cle, label });
  }
  return out;
}

/** Trame applicable, avec son origine */
export async function trameEntretien(entrepriseId: string | null, type: string): Promise<{ rubriques: Rubrique[]; origine: "CLIENT" | "FRANEO" | "DEFAUT" }> {
  if (!TYPES_ENTRETIEN[type]) return { rubriques: [], origine: "DEFAUT" };
  const [client, franeo] = await Promise.all([
    entrepriseId ? prisma.trameEntretien.findFirst({ where: { entrepriseId, type } }) : null,
    prisma.trameEntretien.findFirst({ where: { entrepriseId: null, type } }),
  ]);
  const c = nettoyerRubriques(client?.rubriques);
  if (c.length) return { rubriques: c, origine: "CLIENT" };
  const f = nettoyerRubriques(franeo?.rubriques);
  if (f.length) return { rubriques: f, origine: "FRANEO" };
  return { rubriques: trameParDefaut(type), origine: "DEFAUT" };
}
