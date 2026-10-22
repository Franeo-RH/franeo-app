import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { entrepriseId, abonnementId } = await request.json();

  const demande = await prisma.demandeEvolution.create({
    data: {
      entrepriseId,
      abonnementId,
      statut: "En attente",
    },
  });

  return NextResponse.json({ succes: true, demande });
}