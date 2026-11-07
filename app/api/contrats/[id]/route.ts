import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const c = await prisma.demandeContrat.findUnique({ where: { id }, select: { entrepriseId: true } });
  if (!c || (session.role === "CLIENT" && c.entrepriseId !== session.entrepriseId)) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  await prisma.demandeContrat.delete({ where: { id } });
  return NextResponse.json({ succes: true });
}
