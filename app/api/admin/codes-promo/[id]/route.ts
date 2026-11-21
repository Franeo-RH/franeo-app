import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH { actif } : active ou suspend un code promo */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const s = await getSession();
  if (s?.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  await prisma.codePromo.update({ where: { id: (await params).id }, data: { actif: !!b.actif } });
  return NextResponse.json({ succes: true });
}

/** DELETE : supprime le code (les remises déjà créées restent sur les factures) */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const s = await getSession();
  if (s?.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  await prisma.codePromo.delete({ where: { id: (await params).id } }).catch(() => null);
  return NextResponse.json({ succes: true });
}
