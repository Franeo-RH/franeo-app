// lib/codes-promo.ts
// Codes promo créés par l'admin (ex. TARTENPION = 10 %) : saisis à l'inscription ou rattachés depuis la fiche,
// ils créent une remise datée sur l'entreprise (lib/facturation : appliquerRemises). Sinon, le code est un code de parrainage.

import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";
import { normaliserCode, rattacherParrain } from "@/lib/parrainage";
import { definirCommission } from "@/lib/commissions";

export function texteCodePromo(c: { type: string; valeur: number; nbMois: number | null; portee: string }) {
  if (!(c.valeur > 0)) return "sans remise";
  return `${c.type === "MONTANT" ? `${c.valeur} € par mois` : `${c.valeur} %`} ${c.portee === "TOUT" ? "sur toute la facture" : "sur les abonnements"}${c.nbMois ? ` pendant ${c.nbMois} mois` : " sans limite de durée"}`;
}

function moisSuivant(d = new Date()) {
  const m = d.getMonth() + 2;
  return m > 12 ? { mois: 1, annee: d.getFullYear() + 1 } : { mois: m, annee: d.getFullYear() };
}

/** Code promo valable (actif, non expiré, pas épuisé) */
export async function codePromoValable(code: string) {
  const c = normaliserCode(code);
  if (!c) return null;
  const p = await prisma.codePromo.findUnique({ where: { code: c } }).catch(() => null);
  if (!p) return null;
  if (!p.actif) return { erreur: "Ce code promo n'est plus actif." } as const;
  if (p.finValidite && p.finValidite < new Date()) return { erreur: "Ce code promo a expiré." } as const;
  if (p.maxUtilisations != null && p.utilisations >= p.maxUtilisations) return { erreur: "Ce code promo a atteint son nombre d'utilisations." } as const;
  return { promo: p } as const;
}

/**
 * Applique un code saisi pour une entreprise : code promo (remise immédiate, à partir de la prochaine facture)
 * ou, à défaut, code de parrainage. Renvoie un message d'erreur, ou null si tout va bien.
 */
export async function appliquerCode(entrepriseId: string, code: string, auteur: string): Promise<string | null> {
  const v = await codePromoValable(code);
  if (!v) {
    const erreur = await rattacherParrain(entrepriseId, code, auteur);
    if (erreur) return erreur;
    // Commission reversée au parrain, si le réglage le prévoit
    const r = await prisma.reglageApp.findUnique({ where: { id: "global" } }).catch(() => null);
    if (r && r.parrainageCommissionPct > 0) {
      const e = await prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { parrainId: true } });
      const parrain = e?.parrainId ? await prisma.entreprise.findUnique({ where: { id: e.parrainId }, select: { id: true, nom: true } }) : null;
      if (parrain) await definirCommission(entrepriseId, { pct: r.parrainageCommissionPct, nbMois: r.parrainageCommissionMois, beneficiaire: parrain.nom, parrainId: parrain.id, source: "PARRAINAGE" }, auteur);
    }
    return null;
  }
  if ("erreur" in v) return v.erreur ?? "Code invalide.";
  const p = v.promo;
  const libelle = `Code promo ${p.code}`;
  if (await prisma.remise.findFirst({ where: { entrepriseId, libelle } })) return "Ce code promo est déjà appliqué à cette entreprise.";
  const deja = await prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { commissionSource: true, commissionBeneficiaire: true } });
  if (p.valeur <= 0 && deja?.commissionSource === "CODE_PROMO" && deja.commissionBeneficiaire === (p.beneficiaire || `Code ${p.code}`)) return "Ce code est déjà appliqué à cette entreprise.";
  const debut = moisSuivant();
  if (p.commissionPct && p.commissionPct > 0) await definirCommission(entrepriseId, { pct: p.commissionPct, nbMois: p.commissionMois, beneficiaire: p.beneficiaire || `Code ${p.code}`, source: "CODE_PROMO", debut }, auteur);
  if (p.valeur > 0) await prisma.remise.create({
    data: { entrepriseId, libelle, motif: "CODE_PROMO", type: p.type === "MONTANT" ? "MONTANT" : "POURCENT", valeur: p.valeur, portee: p.portee === "TOUT" ? "TOUT" : "ABONNEMENTS", moisDebut: debut.mois, anneeDebut: debut.annee, nbMois: p.nbMois, creePar: auteur },
  });
  await prisma.codePromo.update({ where: { id: p.id }, data: { utilisations: { increment: 1 } } });
  await journaliser(entrepriseId, auteur, "Remise", `${libelle} appliqué : ${texteCodePromo(p)}`);
  return null;
}
