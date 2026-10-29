import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";

export async function GET() {
  const session = await getSession();
  if (!session || !session.entrepriseId) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const entreprise = await prisma.entreprise.findUnique({
    where: { id: session.entrepriseId },
  });

  return NextResponse.json(entreprise);
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (session?.role === "CLIENT" && !aDroit(session.entreprise?.permissions, "entreprise.modifier")) return NextResponse.json({ erreur: "Action non autorisée pour votre compte. Contactez FRANEO RH." }, { status: 403 });
  if (!session || !session.entrepriseId) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const data = await request.json();

  const entreprise = await prisma.entreprise.update({
    where: { id: session.entrepriseId },
    data: {
      nom: data.nom,
      siret: data.siret || null,
      email: data.email || null,
      telephone: data.telephone || null,
      siteWeb: data.siteWeb || null,
      rue: data.rue || null,
      codePostal: data.codePostal || null,
      ville: data.ville || null,
      pays: data.pays || null,
      banque: data.banque || null,
      iban: data.iban || null,
      bic: data.bic || null,
    },
  });

  return NextResponse.json({ succes: true, entreprise });
}