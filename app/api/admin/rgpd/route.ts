// app/api/admin/rgpd/route.ts
// Admin : journal d'audit (connexions, exports, suppressions…), salariés sortis à anonymiser, purge manuelle.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { CONSERVATION, purgerDonneesExpirees, salariesAAnonymiser } from "@/lib/rgpd";

export const dynamic = "force-dynamic";

const PAR_PAGE = 50;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const p = request.nextUrl.searchParams;
  const page = Math.max(0, Number(p.get("page")) || 0);
  const action = p.get("action") || "";
  const recherche = (p.get("q") || "").trim().slice(0, 100);
  const where = {
    ...(action ? { action } : {}),
    ...(recherche ? { OR: [{ email: { contains: recherche, mode: "insensitive" as const } }, { cible: { contains: recherche, mode: "insensitive" as const } }, { ip: { contains: recherche } }] } : {}),
  };
  const depuis24h = new Date(Date.now() - 24 * 3600 * 1000);
  const [journal, total, echecs24h, blocages24h, aAnonymiser, entreprises] = await Promise.all([
    prisma.journalAudit.findMany({ where, orderBy: { createdAt: "desc" }, skip: page * PAR_PAGE, take: PAR_PAGE }),
    prisma.journalAudit.count({ where }),
    prisma.journalAudit.count({ where: { action: "LOGIN_ECHEC", createdAt: { gte: depuis24h } } }),
    prisma.journalAudit.count({ where: { action: "LOGIN_BLOQUE", createdAt: { gte: depuis24h } } }),
    salariesAAnonymiser(),
    prisma.entreprise.findMany({ select: { id: true, nom: true } }),
  ]);
  const nomEntreprise = new Map(entreprises.map((e) => [e.id, e.nom]));
  return NextResponse.json({
    journal: journal.map((j) => ({ ...j, entreprise: j.entrepriseId ? nomEntreprise.get(j.entrepriseId) ?? null : null })),
    total,
    pages: Math.max(1, Math.ceil(total / PAR_PAGE)),
    echecs24h,
    blocages24h,
    aAnonymiser,
    conservation: CONSERVATION,
  });
}

/** POST { action: "purger" } : lance tout de suite la purge (elle tourne aussi chaque nuit) */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const corps = await request.json().catch(() => ({}));
  if (corps?.action !== "purger") return NextResponse.json({ erreur: "Action inconnue" }, { status: 400 });
  const resultat = await purgerDonneesExpirees();
  return NextResponse.json({ succes: true, resultat });
}
