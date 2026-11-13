// lib/facturation-projets.ts
// Devis et factures de l'option Projets : calcul des lignes, numérotation, montants à facturer.
// Les montants sont HT ; la TVA se règle par document (0 % avec la mention de franchise en base).

import { prisma } from "@/lib/prisma";
import { DELAI_PAIEMENT_JOURS, TYPES_LIGNE, type LigneDevis } from "@/lib/projets-constantes";
import { arrondi, heuresDatees, HEURES_JOUR } from "@/lib/projets";

/** Nettoie les lignes envoyées par le formulaire */
export function lireLignes(v: unknown): LigneDevis[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 100).map((x) => {
    const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
    const type = (String(o.type) in TYPES_LIGNE ? String(o.type) : "FORFAIT") as LigneDevis["type"];
    const n = (k: string) => { const y = Number(o[k]); return Number.isFinite(y) ? Math.round(y * 100) / 100 : 0; };
    return {
      libelle: String(o.libelle ?? "").trim().slice(0, 200), type, quantite: n("quantite"), unite: String(o.unite ?? TYPES_LIGNE[type].unite).slice(0, 15),
      prixUnitaire: n("prixUnitaire"), coutUnitaire: n("coutUnitaire"), salarieId: typeof o.salarieId === "string" && o.salarieId ? o.salarieId : null,
    };
  }).filter((l) => l.libelle);
}

export function totaux(lignes: LigneDevis[], tauxTva = 20) {
  const totalHT = arrondi(lignes.reduce((t, l) => t + l.quantite * l.prixUnitaire, 0));
  const coutTotal = arrondi(lignes.reduce((t, l) => t + l.quantite * l.coutUnitaire, 0));
  const heuresMO = arrondi(lignes.filter((l) => l.type === "MO" && (l.unite === "h" || l.unite === "heure")).reduce((t, l) => t + l.quantite, 0) + lignes.filter((l) => l.type === "MO" && /^j/.test(l.unite)).reduce((t, l) => t + l.quantite * HEURES_JOUR, 0));
  const tva = arrondi((totalHT * tauxTva) / 100);
  return { totalHT, coutTotal, marge: arrondi(totalHT - coutTotal), tauxMarge: totalHT > 0 ? arrondi(((totalHT - coutTotal) / totalHT) * 100, 1) : null, heuresMO, tva, totalTTC: arrondi(totalHT + tva) };
}

/** Prochain numéro : D-2026-0001 pour les devis, F-2026-0001 pour les factures (par entreprise) */
export async function prochainNumero(entrepriseId: string, sorte: "D" | "F", date = new Date()) {
  const prefixe = `${sorte}-${date.getFullYear()}-`;
  const derniers = sorte === "D"
    ? await prisma.devisProjet.findMany({ where: { entrepriseId, numero: { startsWith: prefixe } }, select: { numero: true } })
    : await prisma.factureProjet.findMany({ where: { entrepriseId, numero: { startsWith: prefixe } }, select: { numero: true } });
  const max = derniers.reduce((m, d) => Math.max(m, Number(d.numero.slice(prefixe.length)) || 0), 0);
  return `${prefixe}${String(max + 1).padStart(4, "0")}`;
}

export const echeanceDefaut = (date = new Date()) => new Date(date.getTime() + DELAI_PAIEMENT_JOURS * 86400000);

/** Déjà facturé sur un projet (HT, hors factures annulées) */
export async function dejaFacture(projetId: string) {
  const f = await prisma.factureProjet.aggregate({ where: { projetId, statut: { not: "ANNULEE" } }, _sum: { totalHT: true } });
  return arrondi(f._sum.totalHT ?? 0);
}

/**
 * Régie : temps passé sur la période (badge + saisies), en jours × taux journalier.
 * Signale les périodes déjà facturées en régie qui se chevauchent.
 */
export async function calculRegie(projetId: string, du: string, au: string) {
  const projet = await prisma.projet.findUnique({ where: { id: projetId }, select: { tauxJournalier: true, joursVendus: true } });
  const heures = (await heuresDatees([projetId])).filter((h) => h.jour >= du && h.jour <= au);
  const salaries = await prisma.salarie.findMany({ where: { id: { in: [...new Set(heures.map((h) => h.salarieId))] } }, select: { id: true, prenom: true, nom: true } });
  const parSalarie = salaries.map((s) => {
    const h = arrondi(heures.filter((x) => x.salarieId === s.id).reduce((t, x) => t + x.heures, 0));
    return { salarieId: s.id, salarie: `${s.prenom} ${s.nom}`, heures: h, jours: arrondi(h / HEURES_JOUR, 2) };
  }).filter((x) => x.heures > 0);
  const chevauchements = await prisma.factureProjet.findMany({ where: { projetId, type: "REGIE", statut: { not: "ANNULEE" }, periodeDu: { lte: au }, periodeAu: { gte: du } }, select: { numero: true, periodeDu: true, periodeAu: true } });
  const taux = projet?.tauxJournalier ?? 0;
  return { parSalarie, taux, jours: arrondi(parSalarie.reduce((t, x) => t + x.jours, 0), 2), montant: arrondi(parSalarie.reduce((t, x) => t + x.jours, 0) * taux), chevauchements };
}
