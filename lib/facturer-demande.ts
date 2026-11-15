// lib/facturer-demande.ts
// Devis ou demande complémentaire validé(e) : l'admin saisit le montant et le mois concerné.
// Une ligne « prestation complémentaire » est créée pour ce mois : elle apparaît dans la facture du mois
// et donc dans les montants des tableaux de bord (admin et client).

import { prisma } from "@/lib/prisma";
export { libelleMois } from "@/lib/devis";

const arrondi = (n: number) => Math.round(n * 100) / 100;

/** Montant saisi (« 450 », « 1 250,50 € ») ; null si invalide */
export function lireMontant(v: unknown): number | null {
  const n = Number(String(v ?? "").replace(/[€\s ]/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 && n < 1_000_000 ? arrondi(n) : null;
}

/** Mois et année valides (mois 1 à 12) ; null sinon */
export function lireMois(mois: unknown, annee: unknown): { mois: number; annee: number } | null {
  const m = Number(mois), a = Number(annee);
  return Number.isInteger(m) && m >= 1 && m <= 12 && Number.isInteger(a) && a >= 2020 && a <= 2100 ? { mois: m, annee: a } : null;
}

/** Une facture déjà générée pour ce mois (ligne Facturation) est ajustée de la différence */
async function ajusterFactureGeneree(entrepriseId: string, mois: number, annee: number, delta: number, libelle: string) {
  if (!delta) return;
  const f = await prisma.facturation.findFirst({ where: { entrepriseId, mois, annee }, orderBy: { createdAt: "desc" } });
  if (!f) return;
  const note = `${delta > 0 ? "+" : ""}${delta} € : ${libelle}`;
  await prisma.facturation.update({ where: { id: f.id }, data: { montant: arrondi(f.montant + delta), commentaire: f.commentaire ? `${f.commentaire}\n${note}` : note } });
}

/**
 * Crée ou modifie la ligne de prestation du mois. Si le mois change, l'ancienne ligne est annulée.
 * Renvoie l'id de la ligne (à garder sur le devis / la demande).
 */
export async function facturer(o: {
  entrepriseId: string; commandeId: string | null; code: string; libelle: string; montant: number; mois: number; annee: number; auteur: string;
}): Promise<string> {
  const ancienne = o.commandeId ? await prisma.commandePrestation.findUnique({ where: { id: o.commandeId } }) : null;
  if (ancienne && ancienne.statut !== "ANNULEE" && ancienne.mois === o.mois && ancienne.annee === o.annee) {
    await prisma.commandePrestation.update({ where: { id: ancienne.id }, data: { libelle: o.libelle, prixUnitaire: o.montant, total: o.montant, quantite: 1 } });
    await ajusterFactureGeneree(o.entrepriseId, o.mois, o.annee, arrondi(o.montant - ancienne.total), o.libelle);
    return ancienne.id;
  }
  if (ancienne) await retirerFacturation(ancienne.id);
  const c = await prisma.commandePrestation.create({
    data: {
      entrepriseId: o.entrepriseId, code: o.code, libelle: o.libelle, quantite: 1, prixUnitaire: o.montant, total: o.montant,
      statut: "FAITE", faiteAt: new Date(), auteur: o.auteur, mois: o.mois, annee: o.annee,
    },
  });
  await ajusterFactureGeneree(o.entrepriseId, o.mois, o.annee, o.montant, o.libelle);
  return c.id;
}

/** Retire le montant de la facture du mois (la ligne est annulée, l'historique reste) */
export async function retirerFacturation(commandeId: string | null) {
  if (!commandeId) return;
  const c = await prisma.commandePrestation.findUnique({ where: { id: commandeId } });
  if (!c || c.statut === "ANNULEE") return;
  await prisma.commandePrestation.update({ where: { id: c.id }, data: { statut: "ANNULEE" } });
  await ajusterFactureGeneree(c.entrepriseId, c.mois, c.annee, -c.total, `retrait ${c.libelle}`);
}
