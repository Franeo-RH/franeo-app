// PUT : modifier un modèle ; DELETE : le supprimer (le client ne touche qu'à ses modèles, l'admin à ceux de FRANEO RH)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accesCourriers, lireModele } from "@/lib/courriers-serveur";

type Ctx = { params: Promise<{ id: string }> };

async function charger(id: string) {
  const a = await accesCourriers();
  if (!a.ok) return { ok: false as const, refus: a.refus };
  const m = await prisma.modeleCourrier.findUnique({ where: { id } });
  if (!m || m.entrepriseId !== a.entrepriseId) return { ok: false as const, refus: NextResponse.json({ erreur: "Ce modèle ne peut pas être modifié ici." }, { status: 404 }) };
  return { ok: true as const, m };
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const c = await charger(id);
  if (!c.ok) return c.refus;
  const lu = lireModele(await request.json().catch(() => ({})));
  if ("erreur" in lu) return NextResponse.json({ erreur: lu.erreur }, { status: 400 });
  await prisma.modeleCourrier.update({ where: { id }, data: lu.data });
  return NextResponse.json({ succes: true });
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const c = await charger(id);
  if (!c.ok) return c.refus;
  await prisma.modeleCourrier.delete({ where: { id } });
  return NextResponse.json({ succes: true });
}
