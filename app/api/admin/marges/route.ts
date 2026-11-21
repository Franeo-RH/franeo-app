import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/** PUT (admin) { coutsDirectsPct, chargesPct } : hypothèses de calcul des marges */
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const lire = (v: unknown) => { const n = v === "" || v == null ? 0 : parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null; };
  const c = lire(b.coutsDirectsPct), ch = lire(b.chargesPct);
  if (c == null || ch == null) return NextResponse.json({ erreur: "Pourcentages entre 0 et 100." }, { status: 400 });
  try {
    await prisma.reglageApp.upsert({ where: { id: "global" }, create: { id: "global", margeCoutsDirectsPct: c, margeChargesPct: ch }, update: { margeCoutsDirectsPct: c, margeChargesPct: ch } });
  } catch {
    return NextResponse.json({ erreur: "La base n'est pas à jour : lancez « npx prisma db push »." }, { status: 500 });
  }
  return NextResponse.json({ succes: true });
}
