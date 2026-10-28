import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  const absences = session.role === "ADMIN"
    ? await prisma.absence.findMany({
        include: { salarie: true, entreprise: true },
        orderBy: { createdAt: "desc" },
      })
    : await prisma.absence.findMany({
        where: { entrepriseId: session.entrepriseId! },
        include: { salarie: true },
        orderBy: { createdAt: "desc" },
      });

  return NextResponse.json(absences);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  if (session.role === "CLIENT" && !aDroit(session.entreprise?.permissions, "paie.absences")) {
    return NextResponse.json({ erreur: "Vous n'avez pas le droit de déclarer des absences. Contactez votre gestionnaire." }, { status: 403 });
  }

  const { salarieId, type, dateDebut, dateFin, commentaire } = await request.json();

  if (!salarieId || !type || !dateDebut || !dateFin) {
    return NextResponse.json({ erreur: "Tous les champs obligatoires doivent être remplis" }, { status: 400 });
  }

  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);

  if (fin < debut) {
    return NextResponse.json({ erreur: "La date de fin doit être après la date de début" }, { status: 400 });
  }

  // Vérifier si une absence existe déjà sur cette période pour ce salarié
  const absenceExistante = await prisma.absence.findFirst({
    where: {
      salarieId,
      OR: [
        {
          dateDebut: { lte: fin },
          dateFin: { gte: debut },
        },
      ],
    },
  });

  if (absenceExistante) {
    return NextResponse.json({
      erreur: "Ce salarié a déjà une absence déclarée sur cette période. Veuillez vérifier les dates.",
    }, { status: 400 });
  }

  const entrepriseId = session.role === "ADMIN"
    ? (await prisma.salarie.findUnique({ where: { id: salarieId } }))?.entrepriseId
    : session.entrepriseId!;

  if (!entrepriseId) {
    return NextResponse.json({ erreur: "Entreprise introuvable" }, { status: 404 });
  }

  const absence = await prisma.absence.create({
    data: {
      salarieId,
      entrepriseId,
      type,
      dateDebut: debut,
      dateFin: fin,
      commentaire: commentaire || null,
    },
  });

  return NextResponse.json({ succes: true, absence });
}