import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { normaliser, oublierReponsesApprises } from "@/lib/buddy/apprentissage";
import { capacite } from "@/lib/buddy/catalogue";
import { SOURCES_BUDDY } from "@/lib/buddy/sources-liste";

/** PUT (admin) { reponse?, source?, motsCles?, statut? } : répondre (texte et/ou recherche dans l'app), corriger les mots-clés, ignorer */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const b = await request.json().catch(() => ({}));
  const data: { reponse?: string | null; source?: string | null; action?: string | null; motsCles?: string[]; statut?: string } = {};
  if (b.action !== undefined) { data.action = capacite(b.action) ? String(b.action) : null; if (data.action) data.statut = "REPONDUE"; }
  if (typeof b.reponse === "string") { data.reponse = b.reponse.trim().slice(0, 3000) || null; if (data.reponse) data.statut = "REPONDUE"; }
  if (b.source !== undefined) { data.source = SOURCES_BUDDY.some((s) => s.code === b.source) ? String(b.source) : null; if (data.source) data.statut = "REPONDUE"; }
  if (Array.isArray(b.motsCles)) data.motsCles = (b.motsCles as unknown[]).map((m) => normaliser(String(m))).filter(Boolean).slice(0, 12);
  if (["A_TRAITER", "REPONDUE", "IGNOREE"].includes(b.statut)) data.statut = b.statut;
  if (data.statut === "REPONDUE" && !data.reponse && !data.source && !data.action) {
    const q = await prisma.buddyQuestion.findUnique({ where: { id }, select: { reponse: true, source: true, action: true } });
    const reponse = data.reponse === undefined ? q?.reponse : null;
    const source = data.source === undefined ? q?.source : null;
    const action = data.action === undefined ? q?.action : null;
    if (!reponse && !source && !action) return NextResponse.json({ erreur: "Écrivez une réponse, reliez la question à une action, ou choisissez où Buddy doit chercher." }, { status: 400 });
  }
  await prisma.buddyQuestion.update({ where: { id }, data });
  oublierReponsesApprises();
  return NextResponse.json({ succes: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  await prisma.buddyQuestion.delete({ where: { id: (await params).id } });
  oublierReponsesApprises();
  return NextResponse.json({ succes: true });
}
