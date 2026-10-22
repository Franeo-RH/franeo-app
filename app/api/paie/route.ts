import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mois = parseInt(searchParams.get("mois") || "0");
  const annee = parseInt(searchParams.get("annee") || "0");

  const where = session.role === "ADMIN"
    ? { ...(mois && annee ? { mois, annee } : {}) }
    : {
        entrepriseId: session.entrepriseId!,
        ...(mois && annee ? { mois, annee } : {}),
      };

  const variables = await prisma.variablePaie.findMany({
    where,
    include: {
      salarie: true,
      entreprise: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(variables);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { salarieId, type, valeur, commentaire, mois, annee } = await request.json();

  if (!salarieId || !type || !valeur || !mois || !annee) {
    return NextResponse.json({ erreur: "Tous les champs obligatoires doivent être remplis" }, { status: 400 });
  }

  // Vérifier que le salarié appartient à l'entreprise
  const salarie = await prisma.salarie.findUnique({ where: { id: salarieId } });
  if (!salarie || salarie.entrepriseId !== session.entrepriseId) {
    return NextResponse.json({ erreur: "Salarié introuvable" }, { status: 404 });
  }

  const variable = await prisma.variablePaie.create({
    data: {
      salarieId,
      entrepriseId: session.entrepriseId!,
      type,
      valeur: parseFloat(valeur),
      commentaire: commentaire || null,
      mois: parseInt(mois),
      annee: parseInt(annee),
    },
  });

  return NextResponse.json({ succes: true, variable });
}