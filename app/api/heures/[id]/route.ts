import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { annulerReleve, deciderReleve } from "@/lib/decisions";

/**
 * PUT :
 *  { statut: "Validé" | "Refusé", motif? } : l'employeur (ou l'admin) valide ou refuse un relevé envoyé ;
 *  { action: "annuler" } : un relevé validé est annulé (rouvert au salarié), sauf si l'admin l'a bloqué ;
 *  { action: "bloquer" | "debloquer" } (admin) : empêche l'annulation (paie déjà faite).
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (session.role === "CLIENT" && !aDroit(session.entreprise?.permissions, "paie.releves")) return NextResponse.json({ erreur: "Action non autorisée pour votre compte. Contactez FRANEO RH." }, { status: 403 });
  const { id } = await params;
  const corps = await request.json().catch(() => ({}));

  const r = await prisma.releveMois.findUnique({ where: { id }, select: { entrepriseId: true } });
  if (!r) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  if (session.role === "CLIENT" && r.entrepriseId !== session.entrepriseId) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const auteur = session.role === "ADMIN" ? "FRANEO RH" : session.prenom;

  if (corps?.action === "bloquer" || corps?.action === "debloquer") {
    if (session.role !== "ADMIN") return NextResponse.json({ erreur: "Réservé à FRANEO RH" }, { status: 403 });
    await prisma.releveMois.update({ where: { id }, data: { annulationBloquee: corps.action === "bloquer" } });
    return NextResponse.json({ succes: true });
  }
  if (corps?.action === "annuler") {
    const res = await annulerReleve(id, auteur);
    return res.ok ? NextResponse.json({ succes: true }) : NextResponse.json({ erreur: res.erreur }, { status: res.status });
  }

  const { statut, motif } = corps ?? {};
  if (statut !== "Validé" && statut !== "Refusé") return NextResponse.json({ erreur: "Statut invalide" }, { status: 400 });
  const res = await deciderReleve(id, statut, motif, auteur);
  return res.ok ? NextResponse.json({ succes: true }) : NextResponse.json({ erreur: res.erreur }, { status: res.status });
}

/** DELETE : suppression d'un relevé, impossible une fois validé (il faut d'abord l'annuler) */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const r = await prisma.releveMois.findUnique({ where: { id }, select: { entrepriseId: true, statut: true } });
  if (!r) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  if (session.role === "CLIENT" && (r.entrepriseId !== session.entrepriseId || !aDroit(session.entreprise?.permissions, "paie.releves"))) return NextResponse.json({ erreur: "Non autorisé" }, { status: 403 });
  if (r.statut === "Validé") return NextResponse.json({ erreur: "Relevé validé : il faut d'abord l'annuler avant de le supprimer." }, { status: 400 });
  await prisma.releveMois.delete({ where: { id } });
  return NextResponse.json({ succes: true });
}
