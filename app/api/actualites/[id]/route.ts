import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { THEMATIQUES } from "@/lib/actualites";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const { titre, contenu, thematique } = await request.json();

  if (!titre?.trim() || !contenu?.trim()) {
    return NextResponse.json({ erreur: "Titre et contenu obligatoires" }, { status: 400 });
  }

  const actualite = await prisma.actualite.update({
    where: { id },
    data: {
      titre: titre.trim(),
      contenu: contenu.trim(),
      thematique: THEMATIQUES.includes(thematique) ? thematique : "Général",
    },
  });

  return NextResponse.json({ succes: true, actualite });
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
  await prisma.actualite.delete({ where: { id } });

  return NextResponse.json({ succes: true });
}