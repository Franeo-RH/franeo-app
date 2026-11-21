import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionSalarie } from "@/lib/session";

/** GET (salarié) : ses bulletins de paie, du plus récent au plus ancien */
export async function GET() {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const l = await prisma.bulletin.findMany({ where: { salarieId: s.salarie.id }, select: { id: true, mois: true, annee: true, vuLe: true }, orderBy: [{ annee: "desc" }, { mois: "desc" }] });
  return NextResponse.json(l);
}
