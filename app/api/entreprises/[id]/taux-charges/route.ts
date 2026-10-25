import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Taux de charges patronales utilisé pour le suivi de la masse salariale
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const { tauxCharges } = await request.json();
  const taux = Number(tauxCharges);
  if (!Number.isFinite(taux) || taux < 0 || taux > 100) {
    return NextResponse.json({ erreur: "Le taux doit être compris entre 0 et 100 %." }, { status: 400 });
  }

  await prisma.entreprise.update({ where: { id }, data: { tauxCharges: Math.round(taux * 100) / 100 } });
  return NextResponse.json({ succes: true });
}
