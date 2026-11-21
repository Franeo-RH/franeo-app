import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/** GET (client) : compte rendu d'un entretien */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const e = await prisma.entretien.findFirst({ where: { id: (await params).id, entrepriseId: session.entrepriseId }, select: { compteRendu: true } });
  if (!e) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  return NextResponse.json({ compteRendu: e.compteRendu ?? {} });
}
