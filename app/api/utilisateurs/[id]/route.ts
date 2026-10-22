import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const data = await request.json();

  const updateData: any = {};

  if (data.prenom) updateData.prenom = data.prenom;
  if (data.email) updateData.email = data.email;
  if (data.motDePasse) updateData.motDePasse = await bcrypt.hash(data.motDePasse, 10);

  const utilisateur = await prisma.utilisateur.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ succes: true, utilisateur });
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

  await prisma.utilisateur.delete({ where: { id } });

  return NextResponse.json({ succes: true });
}