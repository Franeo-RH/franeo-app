import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * POST { contenu } : nouveau message sur un ticket.
 * L'auteur et le rôle viennent de la session (jamais du formulaire) ;
 * un client ne peut écrire que sur les tickets de son entreprise.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const ticket = await prisma.ticketSupport.findUnique({ where: { id }, select: { entrepriseId: true } });
  if (!ticket || (session.role !== "ADMIN" && ticket.entrepriseId !== session.entrepriseId)) {
    return NextResponse.json({ erreur: "Ticket introuvable" }, { status: 404 });
  }

  const corps = await request.json().catch(() => ({}));
  const contenu = typeof corps?.contenu === "string" ? corps.contenu.trim().slice(0, 5000) : "";
  if (!contenu) return NextResponse.json({ erreur: "Message vide" }, { status: 400 });

  const message = await prisma.messageTicketSupport.create({
    data: {
      contenu,
      auteur: session.role === "ADMIN" ? "FRANEO RH" : session.prenom,
      role: session.role === "ADMIN" ? "ADMIN" : "CLIENT",
      ticketId: id,
    },
  });

  return NextResponse.json({ succes: true, message });
}
