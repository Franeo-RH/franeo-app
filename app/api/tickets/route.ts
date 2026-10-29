import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { evaluerSurcout, STATUT_ACCORD_REQUIS } from "@/lib/surcout";
import { notifierAdmin } from "@/lib/notifications";
import { aDroit } from "@/lib/droits";

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
  if (session?.role === "CLIENT" && !aDroit(session.entreprise?.permissions, "tickets.creer")) return NextResponse.json({ erreur: "Action non autorisée pour votre compte. Contactez FRANEO RH." }, { status: 403 });
  if (!session || session.role !== "CLIENT") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { titre, description, accepteSurcout } = await request.json();

  if (!titre || !description) {
    return NextResponse.json({ erreur: "Titre et description obligatoires" }, { status: 400 });
  }

  // Tickets inclus épuisés : le ticket est facturé en supplément, avec l'accord du client
  if (accepteSurcout !== true) {
    const surcout = await evaluerSurcout(session.entrepriseId!, { tickets: 1 });
    if (surcout) {
      return NextResponse.json({ surcoutRequis: true, surcout }, { status: STATUT_ACCORD_REQUIS });
    }
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

  await notifierAdmin({
    sujet: `Nouveau ticket RH — ${session.entreprise?.nom || ""}`,
    titre: "🎫 Nouveau ticket RH",
    lignes: [`Entreprise : ${session.entreprise?.nom || "—"}`, `De : ${session.prenom} (${session.email})`, `Objet : ${titre}`, description, ...(accepteSurcout ? ["💳 Ticket facturé en supplément (accord du client donné)"] : [])],
    lien: `/admin/tickets/${ticket.id}`,
    entrepriseId: session.entrepriseId!,
  });

  return NextResponse.json({ succes: true, ticket });
}