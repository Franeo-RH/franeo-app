import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { VIEW_HR_INDICATORS } from "@/lib/indicateurs-calculs";

// POST { salarieId, intitule, date, heures, cout } : ajoute une formation (admin, ou client ayant les indicateurs RH)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const admin = session.role === "ADMIN";
  if (!admin && !(session.entreprise?.permissions || []).includes(VIEW_HR_INDICATORS)) return NextResponse.json({ erreur: "Non autorisé" }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const sal = await prisma.salarie.findUnique({ where: { id: String(b.salarieId || "") }, select: { id: true, entrepriseId: true } });
  if (!sal || (!admin && sal.entrepriseId !== session.entrepriseId)) return NextResponse.json({ erreur: "Salarié introuvable" }, { status: 404 });
  const date = new Date(b.date);
  const heures = Number(String(b.heures ?? 0).replace(",", "."));
  const cout = Number(String(b.cout ?? 0).replace(",", "."));
  if (!String(b.intitule || "").trim() || Number.isNaN(date.getTime()) || !Number.isFinite(heures) || !Number.isFinite(cout)) {
    return NextResponse.json({ erreur: "Intitulé, date, heures et coût sont nécessaires." }, { status: 400 });
  }
  const f = await prisma.formation.create({ data: { salarieId: sal.id, entrepriseId: sal.entrepriseId, intitule: String(b.intitule).trim().slice(0, 200), date, heures, cout } });
  return NextResponse.json({ succes: true, formation: f });
}

// DELETE ?id= : supprime une formation
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const f = await prisma.formation.findUnique({ where: { id: request.nextUrl.searchParams.get("id") || "" } });
  if (!f || (session.role !== "ADMIN" && (f.entrepriseId !== session.entrepriseId || !(session.entreprise?.permissions || []).includes(VIEW_HR_INDICATORS)))) {
    return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  }
  await prisma.formation.delete({ where: { id: f.id } });
  return NextResponse.json({ succes: true });
}
