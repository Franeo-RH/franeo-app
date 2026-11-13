import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionBrute, oublierSessions } from "@/lib/session";
import { aDroit } from "@/lib/droits";

/** Entreprise visée : la sienne (client ou salarié), ?entrepriseId= pour l'admin */
async function cible(request: NextRequest, ecriture: boolean) {
  const u = await getSessionBrute();
  if (!u) return { refus: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  if (u.role === "ADMIN") {
    const id = request.nextUrl.searchParams.get("entrepriseId");
    return id ? { id } : { refus: NextResponse.json({ erreur: "Entreprise manquante" }, { status: 400 }) };
  }
  if (!u.entrepriseId) return { refus: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  if (ecriture && (u.role !== "CLIENT" || !aDroit(u.entreprise?.permissions, "entreprise.modifier"))) return { refus: NextResponse.json({ erreur: "Action non autorisée" }, { status: 403 }) };
  return { id: u.entrepriseId };
}

/** GET : l'image du logo (pour la barre du haut) */
export async function GET(request: NextRequest) {
  const c = await cible(request, false);
  if (!c.id) return c.refus!;
  const l = await prisma.logoEntreprise.findUnique({ where: { entrepriseId: c.id } });
  const m = l ? /^data:(image\/(?:png|jpeg));base64,(.+)$/.exec(l.data) : null;
  if (!l || !m) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(Buffer.from(m[2], "base64")), { headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=86400" } });
}

/** PUT { data: "data:image/png;base64,…", largeur, hauteur } : enregistre le logo (déjà redimensionné par le navigateur) */
export async function PUT(request: NextRequest) {
  const c = await cible(request, true);
  if (!c.id) return c.refus!;
  const b = await request.json().catch(() => ({}));
  const data = typeof b.data === "string" ? b.data : "";
  if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(data)) return NextResponse.json({ erreur: "Image PNG ou JPEG attendue." }, { status: 400 });
  if (data.length > 600_000) return NextResponse.json({ erreur: "Image trop lourde (400 Ko maximum)." }, { status: 400 });
  const largeur = Math.max(1, Math.min(2000, Math.round(Number(b.largeur) || 160))), hauteur = Math.max(1, Math.min(2000, Math.round(Number(b.hauteur) || 80)));
  await prisma.logoEntreprise.upsert({ where: { entrepriseId: c.id }, create: { entrepriseId: c.id, data, largeur, hauteur }, update: { data, largeur, hauteur } });
  oublierSessions();
  return NextResponse.json({ succes: true });
}

export async function DELETE(request: NextRequest) {
  const c = await cible(request, true);
  if (!c.id) return c.refus!;
  await prisma.logoEntreprise.deleteMany({ where: { entrepriseId: c.id } });
  oublierSessions();
  return NextResponse.json({ succes: true });
}
