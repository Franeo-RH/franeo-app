import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { envoyerBilans } from "@/lib/bilan-mensuel";

/** POST (admin) { entrepriseId } : envoie maintenant le bilan du mois dernier à ce client */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  if (typeof b.entrepriseId !== "string") return NextResponse.json({ erreur: "Entreprise manquante" }, { status: 400 });
  const n = await envoyerBilans(b.entrepriseId);
  return n ? NextResponse.json({ succes: true }) : NextResponse.json({ erreur: "Bilan non envoyé (aucun dirigeant, ou e-mail indisponible)." }, { status: 400 });
}
