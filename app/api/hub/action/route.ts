import { NextRequest, NextResponse } from "next/server";
import { appelDuPortail } from "@/lib/hub";
import { ACTIONS, appelInterne } from "@/lib/hub-interne";

export const dynamic = "force-dynamic";

/** POST (portail) { action, params, email } : modification faite depuis le portail, par la route admin existante */
export async function POST(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const def = ACTIONS[String(b.action || "")];
  const appel = def?.(b.params && typeof b.params === "object" ? b.params : {});
  if (!appel) return NextResponse.json({ erreur: "Action inconnue ou incomplète" }, { status: 400 });
  const r = await appelInterne(request, typeof b.email === "string" ? b.email : null, appel.chemin, { methode: appel.methode, corps: appel.corps });
  const d = await r.json().catch(() => ({}));
  return NextResponse.json(r.ok ? { succes: true, ...d } : { erreur: d?.erreur ?? `Action refusée (${r.status})` }, { status: r.ok ? 200 : r.status });
}
