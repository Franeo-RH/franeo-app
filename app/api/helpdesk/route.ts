import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  const tickets = session.role === "ADMIN"
    ? await prisma.ticketSupport.findMany({
        where: { OR: [{ entreprise: { demo: false } }, { categorie: "SUGGESTION" }] },
        include: { entreprise: true, messages: true },
        orderBy: { updatedAt: "desc" },
      })
    : await prisma.ticketSupport.findMany({
        where: { entrepriseId: session.entrepriseId! },
        orderBy: { updatedAt: "desc" },
      });

  return NextResponse.json(tickets);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { titre, description, categorie } = await request.json();

  if (!titre || !description || !categorie) {
    return NextResponse.json({ erreur: "Tous les champs sont obligatoires" }, { status: 400 });
  }

  const ticket = await prisma.ticketSupport.create({
    data: {
      titre,
      description,
      categorie,
      entrepriseId: session.entrepriseId!,
    },
  });

  return NextResponse.json({ succes: true, ticket });
}