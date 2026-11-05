import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";

/** DELETE : supprime le service (les salariés concernés passent « sans service ») */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (session.role === "CLIENT" && !aDroit(session.entreprise?.permissions, "rh.services")) return NextResponse.json({ erreur: "Action non autorisée pour votre compte." }, { status: 403 });
  const { id } = await params;
  const s = await prisma.service.findUnique({ where: { id } });
  if (!s || (session.role === "CLIENT" && s.entrepriseId !== session.entrepriseId)) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  await prisma.salarie.updateMany({ where: { entrepriseId: s.entrepriseId, service: s.nom }, data: { service: null } });
  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ succes: true });
}
