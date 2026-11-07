import { NextRequest, NextResponse } from "next/server";
import { getSessionSalarie } from "@/lib/session";
import { contexteHierarchie } from "@/lib/hierarchie";
import { chargerReleve, lireMoisAnnee } from "@/lib/releves";

/** GET ?mois=&annee= : relevés (RMA) de toute l'équipe du manager ou du dirigeant pour un mois, quel que soit leur statut */
export async function GET(request: NextRequest) {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  const ctx = await contexteHierarchie(s.salarie.id);
  if (!ctx || ctx.role === "SALARIE") return NextResponse.json({ erreur: "Réservé aux managers et dirigeants." }, { status: 403 });
  const p = request.nextUrl.searchParams;
  const ma = lireMoisAnnee(p.get("mois"), p.get("annee"));
  if (!ma) return NextResponse.json({ erreur: "Mois invalide" }, { status: 400 });
  const liste = await Promise.all(ctx.equipe.map(async (m) => ({ salarie: { id: m.id, prenom: m.prenom, nom: m.nom }, ...(await chargerReleve(m.id, ma.mois, ma.annee)) })));
  return NextResponse.json(liste);
}
