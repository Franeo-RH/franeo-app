import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { telecharger } from "@/lib/fichiers";

/** GET : télécharge une pièce jointe ; DELETE : la retire (son auteur ou l'admin) */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const pj = await prisma.pieceJointe.findUnique({ where: { id } });
  if (!pj || (session.role === "CLIENT" && pj.entrepriseId !== session.entrepriseId)) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  return telecharger(pj.contenu, pj.nom, pj.mime);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const pj = await prisma.pieceJointe.findUnique({ where: { id }, select: { entrepriseId: true, role: true } });
  if (!pj || (session.role === "CLIENT" && (pj.entrepriseId !== session.entrepriseId || pj.role !== "CLIENT"))) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  await prisma.pieceJointe.delete({ where: { id } });
  return NextResponse.json({ succes: true });
}
