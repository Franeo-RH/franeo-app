import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";

/**
 * GET ?du=&au=&entrepriseId= : journal (log) des pointages, du plus récent au plus ancien.
 * Admin : tous les clients (hors démo) ou un client ; client : son entreprise.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (session.role === "CLIENT" && !aDroit(session.entreprise?.permissions, "espace.badge")) return NextResponse.json({ erreur: "Le badge n'est pas activé." }, { status: 403 });
  const p = request.nextUrl.searchParams;
  const ok = (x: string | null) => !!x && /^\d{4}-\d{2}-\d{2}$/.test(x);
  const l = await prisma.pointage.findMany({
    where: {
      ...(session.role === "ADMIN"
        ? (p.get("entrepriseId") ? { entrepriseId: p.get("entrepriseId")! } : { entreprise: { demo: false } })
        : { entrepriseId: session.entrepriseId ?? "-" }),
      ...(ok(p.get("du")) || ok(p.get("au")) ? { jour: { ...(ok(p.get("du")) ? { gte: p.get("du")! } : {}), ...(ok(p.get("au")) ? { lte: p.get("au")! } : {}) } } : {}),
    },
    include: { salarie: { select: { prenom: true, nom: true } }, entreprise: { select: { nom: true } } },
    orderBy: { at: "desc" },
    take: 1000,
  });
  return NextResponse.json(l.map((x) => ({ id: x.id, at: x.at, jour: x.jour, type: x.type, adresse: x.adresse, salarie: x.salarie, entreprise: x.entreprise.nom })));
}
