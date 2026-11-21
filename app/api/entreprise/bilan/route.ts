import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/** PUT (dirigeant) { actif } : recevoir ou non le bilan mensuel par e-mail */
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId || session.etablissementId) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  await prisma.entreprise.update({ where: { id: session.entrepriseId }, data: { bilanMensuel: b.actif === true } });
  return NextResponse.json({ succes: true });
}
