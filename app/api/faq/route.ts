import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  // Admin : tout voir ; client : questions communes + celles réservées à son entreprise
  const faqs = await prisma.fAQ.findMany({
    where: session.role === "ADMIN" ? {} : { OR: [{ entrepriseId: null }, { entrepriseId: session.entrepriseId ?? "-" }] },
    orderBy: [{ module: "asc" }, { ordre: "asc" }, { createdAt: "asc" }],
    include: { entreprise: { select: { nom: true } } },
  });
  return NextResponse.json(faqs);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { module, question, reponse, ordre, entrepriseId } = await request.json();

  if (!module || !question || !reponse) {
    return NextResponse.json({ erreur: "Tous les champs sont obligatoires" }, { status: 400 });
  }

  const faq = await prisma.fAQ.create({
    data: { module, question, reponse, ordre: Number(ordre) || 0, entrepriseId: entrepriseId || null },
  });

  return NextResponse.json({ succes: true, faq });
}