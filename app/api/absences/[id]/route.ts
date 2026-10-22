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

  const absence = await prisma.absence.update({
    where: { id },
    data: { statut },
  });

  return NextResponse.json({ succes: true, absence });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.absence.delete({ where: { id } });

  return NextResponse.json({ succes: true });
}