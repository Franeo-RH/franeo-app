import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { THEMATIQUES } from "@/lib/actualites";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  const actualites = await prisma.actualite.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(actualites);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { titre, contenu, thematique } = await request.json();

  if (!titre?.trim() || !contenu?.trim()) {
    return NextResponse.json({ erreur: "Titre et contenu obligatoires" }, { status: 400 });
  }

  const actualite = await prisma.actualite.create({
    data: {
      titre: titre.trim(),
      contenu: contenu.trim(),
      thematique: THEMATIQUES.includes(thematique) ? thematique : "Général",
    },
  });

  return NextResponse.json({ succes: true, actualite });
}