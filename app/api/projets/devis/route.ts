import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accesProjets, lire } from "@/lib/projets-serveur";
import { MODELES_METIER, type LigneDevis } from "@/lib/projets-constantes";
import { prochainNumero, totaux } from "@/lib/facturation-projets";
import { coutsSalaries } from "@/lib/documents-projets";

/** GET : liste des devis (?statut=) */
export async function GET(request: NextRequest) {
  const a = await accesProjets("projets.couts");
  if (!a.ok) return a.refus;
  const statut = request.nextUrl.searchParams.get("statut");
  const devis = await prisma.devisProjet.findMany({
    where: { entrepriseId: a.entrepriseId, ...(statut ? { statut } : {}) },
    orderBy: { createdAt: "desc" },
    select: { id: true, numero: true, objet: true, client: true, statut: true, totalHT: true, coutTotal: true, supplementaire: true, createdAt: true, envoyeLe: true, accepteLe: true, validiteJours: true, projet: { select: { id: true, nom: true } } },
  });
  return NextResponse.json({ devis, peutGerer: a.peutGerer });
}

/**
 * POST { objet, client?, modele?, projetId? } : nouveau devis.
 * Avec un modèle métier : lignes types préchiffrées (main-d'œuvre au coût horaire moyen, prix calculé avec la marge visée).
 * Avec projetId : devis de travaux supplémentaires sur ce projet.
 */
export async function POST(request: NextRequest) {
  const a = await accesProjets("projets.couts");
  if (!a.ok) return a.refus;
  if (!a.peutGerer) return NextResponse.json({ erreur: "Action non autorisée" }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const objet = lire.t(b.objet, 200);
  if (!objet) return NextResponse.json({ erreur: "Indiquez l'objet du devis." }, { status: 400 });
  let projet: { id: string; client: string | null; modele: string | null } | null = null;
  if (typeof b.projetId === "string" && b.projetId) {
    projet = await prisma.projet.findFirst({ where: { id: b.projetId, entrepriseId: a.entrepriseId }, select: { id: true, client: true, modele: true } });
    if (!projet) return NextResponse.json({ erreur: "Projet introuvable" }, { status: 404 });
  }
  const modele = typeof b.modele === "string" && MODELES_METIER[b.modele] ? b.modele : projet?.modele ?? null;
  const margeVisee = 30;
  const { coutMoyen } = await coutsSalaries(a.entrepriseId);
  const prix = (cout: number) => (cout > 0 ? Math.round((cout / (1 - margeVisee / 100)) * 100) / 100 : 0);
  const lignes: LigneDevis[] = projet ? [] : (modele ? MODELES_METIER[modele].lignes : []).map((l) => {
    const cout = l.type === "MO" ? coutMoyen ?? 0 : 0;
    return { ...l, coutUnitaire: cout, prixUnitaire: prix(cout), salarieId: null };
  });
  const t = totaux(lignes);
  const ech = modele ? MODELES_METIER[modele].echeancier[0] : null;
  const d = await prisma.devisProjet.create({
    data: {
      entrepriseId: a.entrepriseId, numero: await prochainNumero(a.entrepriseId, "D"), objet, client: lire.t(b.client, 150) ?? projet?.client ?? null,
      projetId: projet?.id ?? null, supplementaire: !!projet, modele, lignes, margeVisee, acomptePct: ech && ech.jours === 0 ? ech.pct : null,
      totalHT: t.totalHT, coutTotal: t.coutTotal,
      conditions: projet ? "Travaux supplémentaires à réaliser après acceptation écrite du présent devis." : null,
    },
  });
  return NextResponse.json({ succes: true, id: d.id });
}
