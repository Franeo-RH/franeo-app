import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { lireRappel } from "@/lib/rappels";
import { refuserSansDroit } from "@/lib/droits-serveur";

async function salarieAutorise(id: string) {
  const session = await getSession();

  if (!session) {
    return {
      erreur: NextResponse.json(
        { erreur: "Non autorisé" },
        { status: 401 }
      ),
    };
  }

  const salarie = await prisma.salarie.findUnique({
    where: { id },
    select: {
      id: true,
      entrepriseId: true,
    },
  });

  if (!salarie) {
    return {
      erreur: NextResponse.json(
        { erreur: "Introuvable" },
        { status: 404 }
      ),
    };
  }

  if (
    session.role === "CLIENT" &&
    salarie.entrepriseId !== session.entrepriseId
  ) {
    return {
      erreur: NextResponse.json(
        { erreur: "Non autorisé" },
        { status: 401 }
      ),
    };
  }

  return { salarie };
}


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const acces = await salarieAutorise(id);

  if (acces.erreur) {
    return acces.erreur;
  }

  const rappels = await prisma.rappelSalarie.findMany({
    where: {
      salarieId: id,
    },
    orderBy: {
      dateEcheance: "asc",
    },
  });

  return NextResponse.json(rappels);
}


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const refusPOST = await refuserSansDroit("salaries.echeances-modifier");
  if (refusPOST) return refusPOST;

  const acces = await salarieAutorise(id);

  if (acces.erreur) {
    return acces.erreur;
  }


  const body = await request.json();

  const lu = lireRappel(body);


  if (lu.erreur) {
    return NextResponse.json(
      { erreur: lu.erreur },
      { status: 400 }
    );
  }


  if (!lu.valeur || !lu.valeur.type) {
    return NextResponse.json(
      { erreur: "Le type du rappel est obligatoire." },
      { status: 400 }
    );
  }


  const rappel = await prisma.rappelSalarie.create({
    data: {
      salarieId: id,
      type: lu.valeur.type,
      libelle: lu.valeur.libelle ?? null,
      dateEcheance: lu.valeur.dateEcheance,
      commentaire: lu.valeur.commentaire ?? null,
    },
  });


  return NextResponse.json({
    succes: true,
    rappel,
  });
}