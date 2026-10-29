import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notifierAdmin } from "@/lib/notifications";
import { categorieRecrutement } from "@/lib/recrutement";
import { aDroit } from "@/lib/droits";

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
  if (session?.role === "CLIENT" && !aDroit(session.entreprise?.permissions, "tickets.recrutement")) return NextResponse.json({ erreur: "Action non autorisée pour votre compte. Contactez FRANEO RH." }, { status: 403 });
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
      categorie: categorieRecrutement(data.categorie).code,
      facturationAuto: true,
    },
  });

  // Facturation : le lancement (400 €) puis les primes au succès sont ajoutés automatiquement
  // à la facture du mois concerné (lib/facturation.ts)
  await notifierAdmin({
    sujet: `Nouvelle demande de recrutement — ${recrutement.poste}`,
    titre: "🎯 Nouvelle demande de recrutement",
    lignes: [`Poste : ${recrutement.poste} (${categorieRecrutement(recrutement.categorie).label})`, `Contrat : ${recrutement.typeContrat}`],
    lien: "/admin/recrutement",
    entrepriseId: session.entrepriseId!,
  });

  return NextResponse.json({ succes: true, recrutement });
}