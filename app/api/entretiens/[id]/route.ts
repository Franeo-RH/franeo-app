import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { TRAME_ENTRETIEN } from "@/lib/entretiens";

type Ctx = { params: Promise<{ id: string }> };

async function charger(id: string, ecriture: boolean) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) return null;
  if (ecriture && !aDroit(session.entreprise?.permissions, "salaries.modifier")) return null;
  return prisma.entretien.findFirst({ where: { id, entrepriseId: session.entrepriseId } });
}

/** PATCH { date?, responsable?, statut?, compteRendu? } : compte rendu, réalisé, replanifié */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const e = await charger((await params).id, true);
  if (!e) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  const b = await request.json().catch(() => ({}));
  const cr: Record<string, string> = {};
  if (b.compteRendu && typeof b.compteRendu === "object") for (const t of TRAME_ENTRETIEN) if (typeof b.compteRendu[t.cle] === "string") cr[t.cle] = b.compteRendu[t.cle].slice(0, 4000);
  await prisma.entretien.update({
    where: { id: e.id },
    data: {
      ...(/^\d{4}-\d{2}-\d{2}$/.test(String(b.date)) ? { date: new Date(`${b.date}T12:00:00`) } : {}),
      ...(typeof b.responsable === "string" ? { responsable: b.responsable.trim().slice(0, 100) || null } : {}),
      ...(b.statut === "REALISE" || b.statut === "PLANIFIE" ? { statut: b.statut } : {}),
      ...(b.compteRendu ? { compteRendu: cr } : {}),
    },
  });
  return NextResponse.json({ succes: true });
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const e = await charger((await params).id, true);
  if (!e) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  await prisma.entretien.delete({ where: { id: e.id } });
  return NextResponse.json({ succes: true });
}
