import { NextResponse } from "next/server";
import { getSessionSalarie } from "@/lib/session";
import { congesSalarie } from "@/lib/conges-serveur";

/** GET : mes congés (espace salarié) */
export async function GET() {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  return NextResponse.json(await congesSalarie(s.salarie.id));
}
