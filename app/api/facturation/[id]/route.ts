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
  const { montant, dateLimitePaie, statut, commentaire } = await request.json();

  const facturation = await prisma.facturation.update({
    where: { id },
    data: {
      ...(montant ? { montant: parseFloat(montant) } : {}),
      ...(dateLimitePaie ? { dateLimitePaie: new Date(dateLimitePaie) } : {}),
      ...(statut ? { statut } : {}),
      ...(commentaire !== undefined ? { commentaire } : {}),
    },
  });

  return NextResponse.json({ succes: true, facturation });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.facturation.delete({ where: { id } });

  return NextResponse.json({ succes: true });
}