import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aAccesPaie } from "@/lib/droits";
import { salarieVisible } from "@/lib/perimetre";

/** GET ?annee= (client) : bulletins de ses salariés pour une année */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId || !aAccesPaie(session.entreprise)) return NextResponse.json({ erreur: "Non autorisé" }, { status: 403 });
  const annee = Number(request.nextUrl.searchParams.get("annee")) || new Date().getFullYear();
  const l = await prisma.bulletin.findMany({
    where: { entrepriseId: session.entrepriseId, annee },
    select: { id: true, mois: true, annee: true, vuLe: true, salarie: { select: { id: true, prenom: true, nom: true, etablissement: true } } },
    orderBy: [{ mois: "desc" }],
  });
  return NextResponse.json(l.filter((b) => salarieVisible(session, b.salarie)).map(({ salarie, ...b }) => ({ ...b, salarie: { id: salarie.id, nom: `${salarie.prenom} ${salarie.nom}` } })));
}
