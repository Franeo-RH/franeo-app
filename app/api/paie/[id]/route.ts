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
  const { statut } = await request.json();

  const variable = await prisma.variablePaie.update({
    where: { id },
    data: {
      statut,
      ...(statut === "Validé" ? { dateValidation: new Date() } : {}),
    },
  });

  return NextResponse.json({ succes: true, variable });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  const variable = await prisma.variablePaie.findUnique({ where: { id } });

  if (!variable) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });

  if (session.role === "CLIENT") {
    if (variable.entrepriseId !== session.entrepriseId) {
      return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
    }
    // Le client ne peut supprimer qu'une variable encore en attente
    if (variable.statut !== "En attente") {
      return NextResponse.json(
        { erreur: "Seules les variables « En attente » peuvent être supprimées." },
        { status: 403 }
      );
    }
  }

  await prisma.variablePaie.delete({ where: { id } });

  return NextResponse.json({ succes: true });
}
