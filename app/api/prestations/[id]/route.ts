import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Admin : marquer une prestation réalisée, annulée (non facturée) ou à traiter
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const { statut } = await request.json();
  if (!["A_FAIRE", "FAITE", "ANNULEE"].includes(statut)) {
    return NextResponse.json({ erreur: "Statut invalide." }, { status: 400 });
  }
  await prisma.commandePrestation.update({
    where: { id },
    data: { statut, faiteAt: statut === "FAITE" ? new Date() : null },
  });
  return NextResponse.json({ succes: true });
}
