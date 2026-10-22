import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const demandes = await prisma.demandeEvolutionPaie.findMany({
    where: { statut: "EN_ATTENTE" },
    include: {
      entreprise: true,
      ancienneFormule: true,
      nouvelleFormule: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(demandes);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { nouvelleFormuleId } = await req.json();
  if (!nouvelleFormuleId) {
    return NextResponse.json({ erreur: "Formule manquante" }, { status: 400 });
  }

  const entreprise = await prisma.entreprise.findUnique({
    where: { id: session.entrepriseId! },
    select: { abonnementPaieId: true },
  });

  const demandeExistante = await prisma.demandeEvolutionPaie.findFirst({
    where: { entrepriseId: session.entrepriseId!, statut: "EN_ATTENTE" },
  });

  if (demandeExistante) {
    return NextResponse.json({ erreur: "Une demande est déjà en attente" }, { status: 400 });
  }

  const demande = await prisma.demandeEvolutionPaie.create({
    data: {
      entrepriseId: session.entrepriseId!,
      ancienneFormuleId: entreprise?.abonnementPaieId || null,
      nouvelleFormuleId,
    },
  });

  return NextResponse.json(demande);
}