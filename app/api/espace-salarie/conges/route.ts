import { NextRequest, NextResponse } from "next/server";
import { getSessionSalarie } from "@/lib/session";
import { congesDe, congesSalarie } from "@/lib/conges-serveur";
import { contexteHierarchie } from "@/lib/hierarchie";

/** GET : mes congés ; ?equipe=1 : soldes de congés de mon équipe (managers et dirigeants) */
export async function GET(request: NextRequest) {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  if (request.nextUrl.searchParams.get("equipe") !== "1") return NextResponse.json(await congesSalarie(s.salarie.id));

  const ctx = await contexteHierarchie(s.salarie.id);
  if (!ctx || ctx.role === "SALARIE" || ctx.equipe.length === 0) return NextResponse.json({ erreur: "Réservé aux managers" }, { status: 403 });
  const calc = await congesDe(ctx.equipe.map((m) => m.id));
  return NextResponse.json(ctx.equipe.map((m) => {
    const c = calc.get(m.id);
    return { id: m.id, nom: `${m.prenom} ${m.nom}`, poste: m.poste, reste: c?.reste ?? 0, enCours: c?.enCours.acquis ?? 0, enAttente: c?.enAttente ?? 0 };
  }));
}
