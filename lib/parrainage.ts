// lib/parrainage.ts
// Parrainage entre clients : chaque entreprise a un code (FRH-XXXXX) à partager. Quand un nouveau client
// est rattaché à ce code, la récompense réglée dans Admin → Paramètres → Parrainage est créée sous forme
// de remise datée (lib/facturation : appliquerRemises). Par défaut : AUCUNE récompense automatique.

import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O, 1/I

export function normaliserCode(code: string | null | undefined): string {
  return (code || "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 30);
}

function tirerCode() {
  let s = "";
  for (let i = 0; i < 5; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `FRH-${s}`;
}

/** Code de parrainage de l'entreprise (créé à la première demande) */
export async function assurerCode(entrepriseId: string): Promise<string | null> {
  const e = await prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { codeParrainage: true, demo: true } });
  if (!e) return null;
  if (e.codeParrainage) return e.codeParrainage;
  if (e.demo) return null;
  for (let essai = 0; essai < 8; essai++) {
    const code = tirerCode();
    try {
      await prisma.entreprise.update({ where: { id: entrepriseId }, data: { codeParrainage: code } });
      return code;
    } catch {
      // code déjà pris : on retire
    }
  }
  return null;
}

/** Entreprise qui possède ce code (hors démo) */
export async function trouverParrain(code: string | null | undefined) {
  const c = normaliserCode(code);
  if (!c) return null;
  return prisma.entreprise.findFirst({
    where: { codeParrainage: { equals: c, mode: "insensitive" }, demo: false },
    select: { id: true, nom: true, actif: true },
  });
}

export type RecompenseParrainage = { type: string; valeur: number; mois: number; pour: string };

export async function reglageParrainage(): Promise<RecompenseParrainage> {
  const r = await prisma.reglageApp.findUnique({ where: { id: "global" } }).catch(() => null);
  return {
    type: r?.parrainageType ?? "AUCUNE",
    valeur: r?.parrainageValeur ?? 0,
    mois: Math.max(r?.parrainageMois ?? 1, 1),
    pour: r?.parrainagePour ?? "PARRAIN",
  };
}

export function texteRecompense(r: RecompenseParrainage): string {
  if (r.type === "AUCUNE" || !(r.valeur > 0)) return "Aucune récompense automatique";
  const montant = r.type === "MONTANT" ? `${r.valeur} € de remise par mois` : `${r.valeur} % de remise sur les abonnements`;
  const qui = r.pour === "LES_DEUX" ? "pour le parrain et le filleul" : r.pour === "FILLEUL" ? "pour le filleul" : "pour le parrain";
  return `${montant} pendant ${r.mois} mois, ${qui}`;
}

/** Mois suivant (les remises de parrainage démarrent sur la prochaine facture) */
function moisSuivant(d = new Date()) {
  const m = d.getMonth() + 2;
  return m > 12 ? { mois: 1, annee: d.getFullYear() + 1 } : { mois: m, annee: d.getFullYear() };
}

/**
 * Rattache un filleul à son parrain (par code) et crée les remises prévues par le réglage.
 * Renvoie un message d'erreur, ou null si tout va bien.
 */
export async function rattacherParrain(filleulId: string, code: string, auteur: string): Promise<string | null> {
  const parrain = await trouverParrain(code);
  if (!parrain) return "Code de parrainage inconnu.";
  if (parrain.id === filleulId) return "Une entreprise ne peut pas être sa propre marraine.";
  const filleul = await prisma.entreprise.findUnique({ where: { id: filleulId }, select: { id: true, nom: true, parrainId: true, demo: true } });
  if (!filleul) return "Entreprise introuvable.";
  if (filleul.demo) return "L'entreprise de démonstration ne peut pas être parrainée.";
  if (filleul.parrainId) return "Cette entreprise a déjà une marraine.";
  // Pas de boucle : le parrain ne doit pas être lui-même filleul de cette entreprise
  const p = await prisma.entreprise.findUnique({ where: { id: parrain.id }, select: { parrainId: true } });
  if (p?.parrainId === filleulId) return "Ces deux entreprises sont déjà liées dans l'autre sens.";

  await prisma.entreprise.update({ where: { id: filleulId }, data: { parrainId: parrain.id } });

  const r = await reglageParrainage();
  if (r.type !== "AUCUNE" && r.valeur > 0) {
    const debut = moisSuivant();
    const base = { type: r.type === "MONTANT" ? "MONTANT" : "POURCENT", valeur: r.valeur, portee: "ABONNEMENTS", moisDebut: debut.mois, anneeDebut: debut.annee, nbMois: r.mois, creePar: auteur };
    const data = [
      ...(r.pour !== "FILLEUL" ? [{ ...base, entrepriseId: parrain.id, motif: "PARRAINAGE", libelle: `Parrainage de ${filleul.nom}` }] : []),
      ...(r.pour !== "PARRAIN" ? [{ ...base, entrepriseId: filleulId, motif: "FILLEUL", libelle: `Bienvenue (parrainé par ${parrain.nom})` }] : []),
    ];
    if (data.length) await prisma.remise.createMany({ data });
  }
  await journaliser(filleulId, auteur, "Parrainage", `Rattachée à la marraine ${parrain.nom} (${normaliserCode(code)})`);
  await journaliser(parrain.id, auteur, "Parrainage", `Nouvelle filleule : ${filleul.nom}`);
  return null;
}
