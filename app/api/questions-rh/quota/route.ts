import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { usageConseil } from "@/lib/quota-conseil";

export const dynamic = "force-dynamic";

/** GET (client) : demandes de conseil RH ponctuel utilisées ce mois-ci et quota de la formule */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entreprise) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  return NextResponse.json(await usageConseil(session.entreprise));
}
