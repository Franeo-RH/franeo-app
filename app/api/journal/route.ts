import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/** GET ?entrepriseId= (admin) : journal des saisies et modifications de paie, du plus récent au plus ancien */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const p = request.nextUrl.searchParams;
  const entrepriseId = session.role === "ADMIN" ? p.get("entrepriseId") || undefined : session.entrepriseId ?? "-";
  const l = await prisma.journalPaie.findMany({
    where: { ...(entrepriseId ? { entrepriseId } : {}), ...(session.role === "ADMIN" ? { entreprise: { demo: false } } : {}) },
    include: { entreprise: { select: { nom: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return NextResponse.json(l);
}
