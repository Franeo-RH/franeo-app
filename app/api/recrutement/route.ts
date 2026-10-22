import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  if (session.role === "ADMIN") {
    const recrutements = await prisma.demandeRecrutement.findMany({
      include: { entreprise: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(recrutements);
  }

  const recrutements = await prisma.demandeRecrutement.findMany({
    where: { entrepriseId: session.entrepriseId! },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(recrutements);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const data = await request.json();

  if (!data.cgvAcceptees) {
    return NextResponse.json({ erreur: "Vous devez accepter les conditions" }, { status: 400 });
  }

  const recrutement = await prisma.demandeRecrutement.create({
    data: {
      entrepriseId: session.entrepriseId!,
      poste: data.poste,
      typeContrat: data.typeContrat,
      dateDebut: data.dateDebut ? new Date(data.dateDebut) : null,
      salaireMini: data.salaireMini ? parseFloat(data.salaireMini) : null,
      salaireMaxi: data.salaireMaxi ? parseFloat(data.salaireMaxi) : null,
      primes: data.primes || null,
      missions: data.missions,
      profil: data.profil,
      experience: data.experience || null,
      formation: data.formation || null,
      commentaire: data.commentaire || null,
      cgvAcceptees: true,
    },
  });

  // Ajouter 400€ à la facturation du mois
  const maintenant = new Date();
  const moisActuel = maintenant.getMonth() + 1;
  const anneeActuelle = maintenant.getFullYear();

  const dateDemande = new Date(recrutement.createdAt).toLocaleDateString("fr-FR");
  const ligne = `Recrutement du ${dateDemande} (${recrutement.poste}) : 400 €`;

  const facturationExistante = await prisma.facturation.findFirst({
    where: {
      entrepriseId: session.entrepriseId!,
      mois: moisActuel,
      annee: anneeActuelle,
      statut: "En attente",
    },
  });

  if (facturationExistante) {
    const ancien = (facturationExistante.commentaire || "").replace(/ \| /g, "\n");
    await prisma.facturation.update({
      where: { id: facturationExistante.id },
      data: {
        montant: facturationExistante.montant + 400,
        commentaire: ancien ? `${ancien}\n${ligne}` : ligne,
      },
    });
  } else {
    await prisma.facturation.create({
      data: {
        entrepriseId: session.entrepriseId!,
        mois: moisActuel,
        annee: anneeActuelle,
        montant: 400,
        commentaire: ligne,
      },
    });
  }

  return NextResponse.json({ succes: true, recrutement });
}