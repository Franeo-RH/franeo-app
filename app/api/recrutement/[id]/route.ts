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

  const recrutement = await prisma.demandeRecrutement.update({
    where: { id },
    data: { statut },
  });

  return NextResponse.json({ succes: true, recrutement });
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
  await prisma.demandeRecrutement.delete({ where: { id } });

  return NextResponse.json({ succes: true });
}