import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { salarieVisible } from "@/lib/perimetre";
import { congesSalarie } from "@/lib/conges-serveur";

/** GET : compteur de congés du salarié (calcul automatique pour le BTP) */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const s = await prisma.salarie.findUnique({ where: { id }, select: { entrepriseId: true, etablissement: true } });
  if (!s || (session.role === "CLIENT" && (s.entrepriseId !== session.entrepriseId || !salarieVisible(session, s)))) {
    return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  }
  return NextResponse.json(await congesSalarie(id));
}
