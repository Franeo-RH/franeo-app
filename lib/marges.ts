// lib/marges.ts
// Marges par client et par mois :
//   CA catalogue (avant remises) − remises = CA réel
//   CA réel − coûts directs (% réglé) = marge brute          → les remises pèsent sur la marge brute ET nette
//   marge brute − commissions reversées − charges (% réglé) = marge nette → les commissions ne pèsent que sur la nette
// Mois facturé : le montant de la facture fait foi ; sinon, estimation (même calcul que la facture).

import { prisma } from "@/lib/prisma";
import { lignesFacturesMois } from "@/lib/facturation";
import { rangCommission } from "@/lib/commissions";

export type Marge = { caCatalogue: number; remises: number; caReel: number; coutsDirects: number; margeBrute: number; commissions: number; charges: number; margeNette: number; estime: boolean };
export type ReglageMarges = { coutsDirectsPct: number; chargesPct: number };

const arr = (n: number) => Math.round(n * 100) / 100;
export const MARGE_VIDE: Marge = { caCatalogue: 0, remises: 0, caReel: 0, coutsDirects: 0, margeBrute: 0, commissions: 0, charges: 0, margeNette: 0, estime: false };

export async function reglageMarges(): Promise<ReglageMarges> {
  const r = await prisma.reglageApp.findUnique({ where: { id: "global" } }).catch(() => null);
  return { coutsDirectsPct: r?.margeCoutsDirectsPct ?? 0, chargesPct: r?.margeChargesPct ?? 0 };
}

export function additionner(l: Marge[]): Marge {
  return l.reduce((a, m) => ({
    caCatalogue: arr(a.caCatalogue + m.caCatalogue), remises: arr(a.remises + m.remises), caReel: arr(a.caReel + m.caReel), coutsDirects: arr(a.coutsDirects + m.coutsDirects),
    margeBrute: arr(a.margeBrute + m.margeBrute), commissions: arr(a.commissions + m.commissions), charges: arr(a.charges + m.charges), margeNette: arr(a.margeNette + m.margeNette), estime: a.estime || m.estime,
  }), { ...MARGE_VIDE });
}

/** Marges d'un mois, par entreprise (toutes les entreprises hors démo si aucune liste) */
export async function margesMois(mois: number, annee: number, entrepriseIds?: string[], reglage?: ReglageMarges): Promise<Map<string, Marge>> {
  const r = reglage ?? (await reglageMarges());
  const entreprises = await prisma.entreprise.findMany({
    where: { demo: false, ...(entrepriseIds ? { id: { in: entrepriseIds } } : {}) },
    select: { id: true, actif: true, commissionPct: true, commissionMoisDebut: true, commissionAnneeDebut: true, commissionNbMois: true },
  });
  const ids = entreprises.map((e) => e.id);
  if (!ids.length) return new Map();
  const [lignes, factures] = await Promise.all([
    lignesFacturesMois(mois, annee, ids),
    prisma.facturation.findMany({ where: { entrepriseId: { in: ids }, mois, annee }, select: { entrepriseId: true, montant: true } }),
  ]);
  const out = new Map<string, Marge>();
  for (const e of entreprises) {
    const l = lignes.get(e.id) ?? [];
    const remises = arr(-l.filter((x) => x.categorie === "REMISE").reduce((t, x) => t + x.total, 0));
    const f = factures.filter((x) => x.entrepriseId === e.id);
    if (!f.length && e.actif === false) continue;
    const estime = f.length === 0;
    const caReel = arr(estime ? l.reduce((t, x) => t + x.total, 0) : f.reduce((t, x) => t + x.montant, 0));
    if (caReel === 0 && remises === 0) continue;
    const caCatalogue = arr(caReel + remises);
    const coutsDirects = arr((caReel * r.coutsDirectsPct) / 100);
    const margeBrute = arr(caReel - coutsDirects);
    const commissions = rangCommission(e, mois, annee) != null ? arr((caReel * (e.commissionPct ?? 0)) / 100) : 0;
    const charges = arr((caReel * r.chargesPct) / 100);
    out.set(e.id, { caCatalogue, remises, caReel, coutsDirects, margeBrute, commissions, charges, margeNette: arr(margeBrute - commissions - charges), estime });
  }
  return out;
}
