import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionSalarie } from "@/lib/session";

// Le salarié annule une de ses demandes tant qu'elle est en attente
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  const { id } = await params;
  const absence = await prisma.absence.findUnique({ where: { id } });
  if (!absence || absence.salarieId !== s.salarie.id) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  if (absence.statut !== "En attente") {
    return NextResponse.json({ erreur: "Cette absence a déjà été traitée par votre employeur." }, { status: 400 });
  }
  await prisma.absence.delete({ where: { id } });
  return NextResponse.json({ succes: true });
}
