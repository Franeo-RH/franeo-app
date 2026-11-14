import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { refuserSansDroit } from "@/lib/droits-serveur";

export async function POST(request: NextRequest) {
  const refus = await refuserSansDroit("entreprise.abonnements");
  if (refus) return refus;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const corps = await request.json().catch(() => ({}));
  // Un client ne peut faire une demande que pour sa propre entreprise
  const entrepriseId = session.role === "ADMIN" ? String(corps.entrepriseId || "") : session.entrepriseId;
  const abonnementId = String(corps.abonnementId || "");
  if (!entrepriseId || !(await prisma.abonnement.findUnique({ where: { id: abonnementId }, select: { id: true } }))) {
    return NextResponse.json({ erreur: "Demande invalide" }, { status: 400 });
  }

  const demande = await prisma.demandeEvolution.create({
    data: {
      entrepriseId,
      abonnementId,
      statut: "En attente",
    },
  });

  return NextResponse.json({ succes: true, demande });
}