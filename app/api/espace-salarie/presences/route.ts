import { NextRequest, NextResponse } from "next/server";
import { getSessionSalarie } from "@/lib/session";
import { contexteHierarchie } from "@/lib/hierarchie";
import { jourParis } from "@/lib/badge";
import { presencesDuJour } from "@/lib/presences";

/** GET ?jour=AAAA-MM-JJ : présences de l'équipe du manager ou du dirigeant */
export async function GET(request: NextRequest) {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  const ctx = await contexteHierarchie(s.salarie.id);
  if (!ctx || ctx.role === "SALARIE") return NextResponse.json({ erreur: "Réservé aux managers et dirigeants." }, { status: 403 });
  const aujourdhui = jourParis();
  const j = request.nextUrl.searchParams.get("jour");
  const jour = j && /^\d{4}-\d{2}-\d{2}$/.test(j) ? j : aujourdhui;
  return NextResponse.json({ jour, lignes: await presencesDuJour([...ctx.equipeIds], jour, aujourdhui) });
}
