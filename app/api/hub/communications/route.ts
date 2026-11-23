import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appelDuPortail } from "@/lib/hub";
import { CIBLES } from "@/lib/communications-cibles";

export const dynamic = "force-dynamic";
const refus = () => NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
const dateOuNull = (v: unknown) => { if (typeof v !== "string" || !v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; };

/** GET (portail) : messages affichés dans l'app (bandeau des clients / salariés), avec le nombre de lectures */
export async function GET(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return refus();
  const l = await prisma.communication.findMany({ where: { type: "INFO" }, orderBy: { createdAt: "desc" }, take: 50, include: { entreprise: { select: { nom: true } }, _count: { select: { lectures: true } } } });
  return NextResponse.json({
    cibles: CIBLES,
    communications: l.map((c) => ({ id: c.id, titre: c.titre, contenu: c.contenu, cible: c.cible, importante: c.importante, entreprise: c.entreprise?.nom ?? null, publieLe: c.publieLe, expireLe: c.expireLe, date: c.createdAt, lectures: c._count.lectures, lien: "/admin/communication" })),
  });
}

/** POST (portail) { titre, contenu, cible, importante, publieLe?, expireLe?, entrepriseId? } */
export async function POST(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return refus();
  const b = await request.json().catch(() => ({}));
  const titre = String(b.titre || "").trim().slice(0, 200), contenu = String(b.contenu || "").trim().slice(0, 5000);
  if (!titre || !contenu) return NextResponse.json({ erreur: "Titre et message obligatoires" }, { status: 400 });
  const cible = CIBLES.some((c) => c.value === b.cible) ? b.cible : "CLIENTS";
  const debut = dateOuNull(b.publieLe), fin = dateOuNull(b.expireLe);
  if (debut && fin && fin <= debut) return NextResponse.json({ erreur: "La date de retrait doit être après la date de publication." }, { status: 400 });
  let entrepriseId: string | null = null;
  if (b.entrepriseId) {
    const e = await prisma.entreprise.findUnique({ where: { id: String(b.entrepriseId) }, select: { id: true } });
    if (!e) return NextResponse.json({ erreur: "Client introuvable dans cette app" }, { status: 404 });
    entrepriseId = e.id;
  }
  const c = await prisma.communication.create({ data: { titre, contenu, cible, entrepriseId, importante: !!b.importante, publieLe: debut, expireLe: fin } });
  return NextResponse.json({ succes: true, id: c.id });
}

/** DELETE (portail) ?id= */
export async function DELETE(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return refus();
  await prisma.communication.delete({ where: { id: request.nextUrl.searchParams.get("id") || "-" } }).catch(() => null);
  return NextResponse.json({ succes: true });
}
