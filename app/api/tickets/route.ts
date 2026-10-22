import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  const tickets = session.role === "ADMIN"
    ? await prisma.ticket.findMany({
        include: { entreprise: true },
        orderBy: { createdAt: "desc" },
      })
    : await prisma.ticket.findMany({
        where: { entrepriseId: session.entrepriseId! },
        orderBy: { createdAt: "desc" },
      });

  return NextResponse.json(tickets);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { titre, description } = await request.json();

  if (!titre || !description) {
    return NextResponse.json({ erreur: "Titre et description obligatoires" }, { status: 400 });
  }

  // Vérifier les tickets restants
  const entreprise = await prisma.entreprise.findUnique({
    where: { id: session.entrepriseId! },
    include: { abonnement: true },
  });

  const ticketsInclus = entreprise?.abonnement?.ticketsRH || 0;
  const ticketsUtilises = entreprise?.ticketsUtilises || 0;

  if (ticketsUtilises >= ticketsInclus) {
    return NextResponse.json(
      { erreur: "Vous n'avez plus de tickets disponibles ce mois-ci" },
      { status: 400 }
    );
  }

  // Créer le ticket
  const ticket = await prisma.ticket.create({
    data: {
      titre,
      description,
      entrepriseId: session.entrepriseId!,
    },
  });

  // Incrémenter le compteur de tickets utilisés
  await prisma.entreprise.update({
    where: { id: session.entrepriseId! },
    data: { ticketsUtilises: { increment: 1 } },
  });

  return NextResponse.json({ succes: true, ticket });
}