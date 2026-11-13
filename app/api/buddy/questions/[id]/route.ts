import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { normaliser } from "@/lib/buddy/apprentissage";

/** PUT (admin) { reponse?, motsCles?, statut? } : répondre, corriger les mots-clés, ignorer */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const b = await request.json().catch(() => ({}));
  const data: { reponse?: string; motsCles?: string[]; statut?: string } = {};
  if (typeof b.reponse === "string") { data.reponse = b.reponse.trim().slice(0, 3000); if (data.reponse) data.statut = "REPONDUE"; }
  if (Array.isArray(b.motsCles)) data.motsCles = (b.motsCles as unknown[]).map((m) => normaliser(String(m))).filter(Boolean).slice(0, 12);
  if (["A_TRAITER", "REPONDUE", "IGNOREE"].includes(b.statut)) data.statut = b.statut;
  if (data.statut === "REPONDUE" && !data.reponse) {
    const q = await prisma.buddyQuestion.findUnique({ where: { id }, select: { reponse: true } });
    if (!q?.reponse) return NextResponse.json({ erreur: "Écrivez une réponse." }, { status: 400 });
  }
  await prisma.buddyQuestion.update({ where: { id }, data });
  return NextResponse.json({ succes: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  await prisma.buddyQuestion.delete({ where: { id: (await params).id } });
  return NextResponse.json({ succes: true });
}
