import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appelDuPortail } from "@/lib/hub";
import { THEMATIQUES } from "@/lib/actualites";

export const dynamic = "force-dynamic";
const refus = () => NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

/** GET (portail) : actualités publiées et thématiques disponibles */
export async function GET(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return refus();
  const l = await prisma.actualite.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json({ thematiques: THEMATIQUES, actualites: l.map((a) => ({ id: a.id, titre: a.titre, contenu: a.contenu, thematique: a.thematique, date: a.createdAt, lien: "/admin/actualites" })) });
}

/** POST (portail) { titre, contenu, thematique } : publie une actualité */
export async function POST(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return refus();
  const b = await request.json().catch(() => ({}));
  const titre = String(b.titre || "").trim().slice(0, 200), contenu = String(b.contenu || "").trim().slice(0, 20000);
  if (!titre || !contenu) return NextResponse.json({ erreur: "Titre et contenu obligatoires" }, { status: 400 });
  const a = await prisma.actualite.create({ data: { titre, contenu, thematique: THEMATIQUES.includes(b.thematique) ? b.thematique : "Général" } });
  return NextResponse.json({ succes: true, id: a.id });
}

/** PUT (portail) { id, titre, contenu, thematique } */
export async function PUT(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return refus();
  const b = await request.json().catch(() => ({}));
  const titre = String(b.titre || "").trim().slice(0, 200), contenu = String(b.contenu || "").trim().slice(0, 20000);
  if (!b.id || !titre || !contenu) return NextResponse.json({ erreur: "Titre et contenu obligatoires" }, { status: 400 });
  await prisma.actualite.update({ where: { id: String(b.id) }, data: { titre, contenu, thematique: THEMATIQUES.includes(b.thematique) ? b.thematique : "Général" } });
  return NextResponse.json({ succes: true });
}

/** DELETE (portail) ?id= */
export async function DELETE(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return refus();
  await prisma.actualite.delete({ where: { id: request.nextUrl.searchParams.get("id") || "-" } }).catch(() => null);
  return NextResponse.json({ succes: true });
}
