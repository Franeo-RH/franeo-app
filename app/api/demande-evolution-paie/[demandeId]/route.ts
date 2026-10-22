import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ demandeId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { demandeId } = await params;
  const { action } = await req.json();

  const demande = await prisma.demandeEvolutionPaie.findUnique({
    where: { id: demandeId },
  });

  if (!demande) {
    return NextResponse.json({ erreur: "Demande introuvable" }, { status: 404 });
  }

  if (action === "VALIDER") {
    await prisma.$transaction([
      prisma.entreprise.update({
        where: { id: demande.entrepriseId },
        data: { abonnementPaieId: demande.nouvelleFormuleId },
      }),
      prisma.demandeEvolutionPaie.update({
        where: { id: demandeId },
        data: { statut: "VALIDEE", traiteeAt: new Date() },
      }),
    ]);
  } else {
    await prisma.demandeEvolutionPaie.update({
      where: { id: demandeId },
      data: { statut: "REFUSEE", traiteeAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}