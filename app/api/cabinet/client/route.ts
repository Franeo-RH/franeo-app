import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionCabinet, filtreClients, destinationValide } from "@/lib/cabinet";
import { COOKIE_CLIENT_CABINET } from "@/lib/jeton-session";

// POST { entrepriseId, vers } : ouvre le dossier d'un client (null : retour au portefeuille)
export async function POST(request: NextRequest) {
  const session = await getSessionCabinet();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const options = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 };

  if (!b.entrepriseId) {
    const res = NextResponse.json({ vers: "/cabinet" });
    res.cookies.set(COOKIE_CLIENT_CABINET, "", { ...options, maxAge: 0 });
    return res;
  }
  const client = typeof b.entrepriseId === "string"
    ? await prisma.entreprise.findFirst({ where: { AND: [{ id: b.entrepriseId, actif: true }, filtreClients(session.modeCabinet)] }, select: { id: true } })
    : null;
  if (!client) return NextResponse.json({ erreur: "Ce dossier n'est pas accessible." }, { status: 403 });
  const res = NextResponse.json({ vers: destinationValide(b.vers) });
  res.cookies.set(COOKIE_CLIENT_CABINET, client.id, options);
  return res;
}
