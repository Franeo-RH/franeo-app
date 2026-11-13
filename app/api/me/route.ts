import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { aAccesPaie } from "@/lib/droits";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  // Logo du client (barre du haut) : version = date de mise à jour, pour rafraîchir l'image après un changement
  const logo = session.entrepriseId ? await prisma.logoEntreprise.findUnique({ where: { entrepriseId: session.entrepriseId }, select: { updatedAt: true } }) : null;
  return NextResponse.json({
    logoVersion: logo ? logo.updatedAt.getTime() : null,
    prenom: session.prenom,
    role: session.role,
    permissions: session.entreprise?.permissions || [],
    aPaie: aAccesPaie(session.entreprise),
    demo: !!session.entreprise?.demo,
  });
}