import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/** GET ?statut= : notes de frais de l'entreprise (client) ou de tous (admin, ?entrepriseId=) */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const p = request.nextUrl.searchParams;
  const frais = await prisma.noteFrais.findMany({
    where: {
      ...(session.role === "ADMIN" ? (p.get("entrepriseId") ? { entrepriseId: p.get("entrepriseId")! } : {}) : { entrepriseId: session.entrepriseId ?? "-" }),
      ...(p.get("statut") ? { statut: p.get("statut")! } : {}),
    },
    include: { salarie: { select: { prenom: true, nom: true } }, entreprise: { select: { nom: true } } },
    orderBy: { date: "desc" },
    take: 300,
  });
  return NextResponse.json(frais);
}
