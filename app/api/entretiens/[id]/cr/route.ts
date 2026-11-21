import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { nettoyerRubriques, trameEntretien } from "@/lib/trames-entretien";

/** GET (client) : compte rendu d'un entretien */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const e = await prisma.entretien.findFirst({ where: { id: (await params).id, entrepriseId: session.entrepriseId }, select: { compteRendu: true, rubriques: true, type: true } });
  if (!e) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  const figees = nettoyerRubriques(e.rubriques);
  const rubriques = figees.length ? figees : (await trameEntretien(session.entrepriseId, e.type).catch(() => null))?.rubriques ?? [];
  return NextResponse.json({ compteRendu: e.compteRendu ?? {}, rubriques });
}
