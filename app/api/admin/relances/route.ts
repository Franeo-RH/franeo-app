import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { relancerFacture } from "@/lib/relances";

/** POST (admin) { facturationId } : relancer une facture tout de suite */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const r = await relancerFacture(String(b.facturationId || ""), true);
  return r.ok ? NextResponse.json({ succes: true }) : NextResponse.json({ erreur: r.erreur }, { status: 400 });
}
