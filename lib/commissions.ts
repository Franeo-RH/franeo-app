// lib/commissions.ts
// Commissions à reverser : un % du CA d'un client à un apporteur (bénéficiaire d'un code promo) ou à son parrain,
// selon le réglage. Calculées chaque mois sur les factures du client (CA encaissé ou facturé).

import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";

export type ParamCommission = { pct: number; nbMois: number | null; beneficiaire: string; parrainId?: string | null; source: "PARRAINAGE" | "CODE_PROMO" | "MANUELLE"; debut?: { mois: number; annee: number } };

function moisSuivant(d = new Date()) {
  const m = d.getMonth() + 2;
  return m > 12 ? { mois: 1, annee: d.getFullYear() + 1 } : { mois: m, annee: d.getFullYear() };
}

/**
 * Premier mois concerné par une remise ou une commission accordée aujourd'hui : le mois en cours si sa facture
 * n'est pas encore générée pour ce client (l'estimation en tient compte tout de suite), sinon le mois suivant.
 */
export async function moisDepart(entrepriseId: string, d = new Date()) {
  const mois = d.getMonth() + 1, annee = d.getFullYear();
  const facture = await prisma.facturation.findFirst({ where: { entrepriseId, mois, annee }, select: { id: true } });
  return facture ? moisSuivant(d) : { mois, annee };
}

/** Rang du mois dans la période de commission (0 = premier mois), ou null hors période */
export function rangCommission(e: { commissionPct: number | null; commissionMoisDebut: number | null; commissionAnneeDebut: number | null; commissionNbMois: number | null }, mois: number, annee: number): number | null {
  if (!(e.commissionPct && e.commissionPct > 0) || !e.commissionMoisDebut || !e.commissionAnneeDebut) return null;
  const rang = (annee - e.commissionAnneeDebut) * 12 + (mois - e.commissionMoisDebut);
  if (rang < 0) return null;
  if (e.commissionNbMois != null && rang >= e.commissionNbMois) return null;
  return rang;
}

export async function definirCommission(entrepriseId: string, p: ParamCommission, auteur: string) {
  const debut = p.debut ?? (await moisDepart(entrepriseId));
  await prisma.entreprise.update({
    where: { id: entrepriseId },
    data: { commissionPct: p.pct, commissionNbMois: p.nbMois, commissionBeneficiaire: p.beneficiaire.slice(0, 120), commissionParrainId: p.parrainId ?? null, commissionMoisDebut: debut.mois, commissionAnneeDebut: debut.annee, commissionSource: p.source },
  });
  await journaliser(entrepriseId, auteur, "Commission", `${p.pct} % du CA reversé à ${p.beneficiaire} dès ${String(debut.mois).padStart(2, "0")}/${debut.annee}${p.nbMois ? ` pendant ${p.nbMois} mois` : " (sans fin)"}`);
}

export async function retirerCommission(entrepriseId: string, auteur: string) {
  await prisma.entreprise.update({ where: { id: entrepriseId }, data: { commissionPct: null, commissionNbMois: null, commissionBeneficiaire: null, commissionParrainId: null, commissionMoisDebut: null, commissionAnneeDebut: null, commissionSource: null } });
  await journaliser(entrepriseId, auteur, "Commission", "Commission retirée");
}

export type LigneCommission = { entrepriseId: string; entreprise: string; beneficiaire: string; source: string | null; pct: number; facture: number; encaisse: number; base: number; montant: number; versee: { montant: number; verseLe: Date } | null };

/** Commissions dues pour un mois. base « ENCAISSE » (factures payées) ou « FACTURE » (toutes les factures) */
export async function commissionsDuMois(mois: number, annee: number, base: "ENCAISSE" | "FACTURE" = "ENCAISSE"): Promise<LigneCommission[]> {
  const entreprises = await prisma.entreprise.findMany({
    where: { demo: false, commissionPct: { gt: 0 } },
    select: { id: true, nom: true, commissionPct: true, commissionMoisDebut: true, commissionAnneeDebut: true, commissionNbMois: true, commissionBeneficiaire: true, commissionSource: true },
  });
  const actives = entreprises.filter((e) => rangCommission(e, mois, annee) != null);
  if (!actives.length) return [];
  const ids = actives.map((e) => e.id);
  const [factures, versees] = await Promise.all([
    prisma.facturation.findMany({ where: { entrepriseId: { in: ids }, mois, annee }, select: { entrepriseId: true, montant: true, statut: true } }),
    prisma.commissionVersee.findMany({ where: { entrepriseId: { in: ids }, mois, annee } }),
  ]);
  const arr = (n: number) => Math.round(n * 100) / 100;
  return actives.map((e) => {
    const f = factures.filter((x) => x.entrepriseId === e.id);
    const facture = arr(f.reduce((t, x) => t + x.montant, 0));
    const encaisse = arr(f.filter((x) => x.statut === "Payé").reduce((t, x) => t + x.montant, 0));
    const b = base === "FACTURE" ? facture : encaisse;
    const v = versees.find((x) => x.entrepriseId === e.id);
    return { entrepriseId: e.id, entreprise: e.nom, beneficiaire: e.commissionBeneficiaire || "—", source: e.commissionSource, pct: e.commissionPct!, facture, encaisse, base: b, montant: arr((b * e.commissionPct!) / 100), versee: v ? { montant: v.montant, verseLe: v.verseLe } : null };
  }).sort((a, b) => a.beneficiaire.localeCompare(b.beneficiaire) || a.entreprise.localeCompare(b.entreprise));
}

export const texteCommission = (pct: number, nbMois: number | null | undefined) => `${pct} % du CA${nbMois ? ` pendant ${nbMois} mois` : " sans limite de durée"}`;
