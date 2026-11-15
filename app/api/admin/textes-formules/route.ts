// app/api/admin/textes-formules/route.ts
// PUT { cle, message, lignes[] } : modifie les textes d'une formule vus par les clients
// DELETE ?cle= : revient au texte par défaut de la grille

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const cleValide = (c: unknown): c is string => typeof c === "string" && /^(rh:.{1,80}|paie:[A-Z_]{1,40}|mention)$/.test(c);

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  if (!cleValide(b.cle)) return NextResponse.json({ erreur: "Formule inconnue" }, { status: 400 });
  const message = typeof b.message === "string" ? b.message.trim().slice(0, 600) : "";
  const lignes = Array.isArray(b.lignes) ? (b.lignes as unknown[]).map((l) => String(l ?? "").trim().slice(0, 300)).filter(Boolean).slice(0, 40) : [];
  await prisma.texteFormule.upsert({ where: { cle: b.cle }, create: { cle: b.cle, message, lignes }, update: { message, lignes } });
  return NextResponse.json({ succes: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const cle = request.nextUrl.searchParams.get("cle");
  if (!cleValide(cle)) return NextResponse.json({ erreur: "Formule inconnue" }, { status: 400 });
  await prisma.texteFormule.deleteMany({ where: { cle } });
  return NextResponse.json({ succes: true });
}
