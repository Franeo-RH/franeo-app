import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };
const txt = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function PUT(request: NextRequest, { params }: Ctx) {
  const s = await getSession();
  if (s?.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const nom = txt(b.nom, 100), sujet = txt(b.sujet, 200), corps = txt(b.corps, 8000);
  if (!nom || !sujet || !corps) return NextResponse.json({ erreur: "Nom, objet et message obligatoires." }, { status: 400 });
  await prisma.modeleEmail.update({ where: { id: (await params).id }, data: { nom, sujet, corps } });
  return NextResponse.json({ succes: true });
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const s = await getSession();
  if (s?.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  await prisma.modeleEmail.delete({ where: { id: (await params).id } });
  return NextResponse.json({ succes: true });
}
