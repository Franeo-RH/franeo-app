import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appelDuPortail } from "@/lib/hub";
import { COLONNES_RUP, registrePersonnel } from "@/lib/rup";

export const dynamic = "force-dynamic";
const cellule = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** GET (portail) ?quoi=rup&id=<entreprise> : registre unique du personnel (CSV lisible par Excel) */
export async function GET(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const p = request.nextUrl.searchParams;
  const id = p.get("id") ?? "";
  if (p.get("quoi") === "rup") {
    const e = await prisma.entreprise.findUnique({ where: { id }, select: { nom: true } });
    if (!e) return NextResponse.json({ erreur: "Client introuvable" }, { status: 404 });
    const lignes = await registrePersonnel(id);
    const csv = "﻿" + [COLONNES_RUP.map(cellule).join(";"), ...lignes.map((l) => l.cellules.map(cellule).join(";"))].join("\r\n");
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="registre-personnel-${e.nom.replace(/[^\w-]+/g, "-").slice(0, 40)}.csv"` } });
  }
  return NextResponse.json({ erreur: "Document inconnu" }, { status: 404 });
}
