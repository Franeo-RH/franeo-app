import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const { decision, entrepriseId, abonnementId } = await request.json();

  if (decision === "Acceptée") {
    // Mettre à jour l'abonnement de l'entreprise
    await prisma.entreprise.update({
      where: { id: entrepriseId },
      data: { abonnementId },
    });

    // Supprimer la demande
    await prisma.demandeEvolution.delete({
      where: { id },
    });

  } else {
    // Refusée — juste supprimer la demande
    await prisma.demandeEvolution.delete({
      where: { id },
    });
  }

  return NextResponse.json({ succes: true });
}