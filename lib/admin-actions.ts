// Suppressions et modifications génériques côté admin (liste blanche : modèle → champs modifiables)
import { prisma } from "@/lib/prisma";

import { MODIFIABLES } from "@/lib/admin-champs";
export { MODIFIABLES };

export const SUPPRIMABLES = [
  "absence", "variablePaie", "ticket", "ticketSupport", "facturation", "rappelSalarie", "releveMois", "commandePrestation",
  "demandeSalarie", "demandeRecrutement", "devis", "questionRH", "communication", "salarie",
] as const;

// Accès aux délégués Prisma par nom de modèle (liste blanche ci-dessus uniquement)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const delegue = (modele: string) => (prisma as any)[modele] as { update: (a: unknown) => Promise<unknown>; delete: (a: unknown) => Promise<unknown>; findUnique: (a: unknown) => Promise<unknown> };

export function convertir(modele: string, data: Record<string, unknown>): Record<string, unknown> | string {
  const champs = MODIFIABLES[modele];
  if (!champs) return "Modification non disponible";
  const sortie: Record<string, unknown> = {};
  for (const [cle, brut] of Object.entries(data)) {
    const c = champs[cle];
    if (!c) continue;
    if (c.type === "nombre") {
      const n = Number(String(brut).replace(",", "."));
      if (!Number.isFinite(n)) return `Valeur invalide pour ${cle}`;
      sortie[cle] = cle === "mois" || cle === "annee" || cle === "quantite" ? Math.round(n) : n;
    } else if (c.type === "date") {
      if (!brut) { sortie[cle] = null; continue; }
      const d = new Date(String(brut));
      if (Number.isNaN(d.getTime())) return `Date invalide pour ${cle}`;
      sortie[cle] = d;
    } else if (c.type === "booleen") {
      sortie[cle] = brut === true || brut === "true" || brut === "1";
    } else if (c.type === "liste") {
      if (!c.options!.includes(String(brut))) return `Valeur non autorisée pour ${cle}`;
      sortie[cle] = String(brut);
    } else {
      sortie[cle] = brut === null || brut === "" ? null : String(brut).slice(0, 3000);
    }
  }
  return sortie;
}

export async function modifier(modele: string, id: string, data: Record<string, unknown>) {
  const conv = convertir(modele, data);
  if (typeof conv === "string") return { erreur: conv };
  if (modele === "commandePrestation" && ("quantite" in conv || "prixUnitaire" in conv)) {
    const avant = (await delegue(modele).findUnique({ where: { id } })) as { quantite: number; prixUnitaire: number } | null;
    if (avant) conv.total = Math.round(Number(conv.quantite ?? avant.quantite) * Number(conv.prixUnitaire ?? avant.prixUnitaire) * 100) / 100;
  }
  await delegue(modele).update({ where: { id }, data: conv });
  return {};
}

export async function supprimer(modele: string, id: string) {
  if (!(SUPPRIMABLES as readonly string[]).includes(modele)) return { erreur: "Suppression non disponible" };
  await delegue(modele).delete({ where: { id } });
  return {};
}
