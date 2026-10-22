import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { lireRappel, versISO } from "@/lib/rappels";

async function rappelAutorise(rappelId: string) {
  const session = await getSession();
  if (!session) return { erreur: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  const rappel = await prisma.rappelSalarie.findUnique({
    where: { id: rappelId },
    include: { salarie: { select: { entrepriseId: true } } },
  });
  if (!rappel) return { erreur: NextResponse.json({ erreur: "Introuvable" }, { status: 404 }) };
  if (session.role === "CLIENT" && rappel.salarie.entrepriseId !== session.entrepriseId) {
    return { erreur: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  }
  return { rappel };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ rappelId: string }> }
) {
  const { rappelId } = await params;
  const acces = await rappelAutorise(rappelId);
  if (acces.erreur) return acces.erreur;
  const rappel = acces.rappel;

  const body = (await request.json()) as Record<string, unknown>;
  const maj: {
    traite?: boolean;
    traiteAt?: Date | null;
    type?: string;
    libelle?: string | null;
    dateEcheance?: Date;
    commentaire?: string | null;
  } = {};

  if (typeof body.traite === "boolean") {
    maj.traite = body.traite;
    maj.traiteAt = body.traite ? new Date() : null;
  }

  const modifieContenu = ["type", "dateEcheance", "libelle", "commentaire"].some((k) => k in body);
  if (modifieContenu) {
    const lu = lireRappel({
      type: body.type ?? rappel.type,
      dateEcheance: body.dateEcheance ?? versISO(rappel.dateEcheance),
      libelle: "libelle" in body ? body.libelle : rappel.libelle,
      commentaire: "commentaire" in body ? body.commentaire : rappel.commentaire,
    });
    if (lu.erreur) return NextResponse.json({ erreur: lu.erreur }, { status: 400 });
    Object.assign(maj, lu.valeur);
  }

  const updated = await prisma.rappelSalarie.update({ where: { id: rappelId }, data: maj });
  return NextResponse.json({ succes: true, updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ rappelId: string }> }
) {
  const { rappelId } = await params;
  const acces = await rappelAutorise(rappelId);
  if (acces.erreur) return acces.erreur;

  await prisma.rappelSalarie.delete({ where: { id: rappelId } });
  return NextResponse.json({ succes: true });
}