import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const facturations = await prisma.facturation.findMany({
    where: { entreprise: { demo: false } },
    include: { entreprise: true },
    orderBy: [{ annee: "desc" }, { mois: "desc" }],
  });

  return NextResponse.json(facturations);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { entrepriseId, mois, annee, montant, dateLimitePaie, commentaire } = await request.json();

  if (!entrepriseId || !mois || !annee || !montant) {
    return NextResponse.json({ erreur: "Champs obligatoires manquants" }, { status: 400 });
  }

  // Vérifier si une facturation existe déjà pour ce mois/année/entreprise
  const existante = await prisma.facturation.findFirst({
    where: { entrepriseId, mois: parseInt(mois), annee: parseInt(annee) },
  });

  if (existante) {
    return NextResponse.json({ erreur: "Une facturation existe déjà pour ce mois" }, { status: 400 });
  }

  const facturation = await prisma.facturation.create({
    data: {
      entrepriseId,
      mois: parseInt(mois),
      annee: parseInt(annee),
      montant: parseFloat(montant),
      dateLimitePaie: dateLimitePaie ? new Date(dateLimitePaie) : null,
      commentaire: commentaire || null,
    },
  });

  return NextResponse.json({ succes: true, facturation });
}