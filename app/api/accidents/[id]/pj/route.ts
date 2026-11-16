// POST (formulaire, champ « fichier ») : document du dossier (DAT, questionnaire, courrier de la CPAM…)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accesAccidents } from "@/lib/accidents-serveur";
import { ajouterPieceJointe } from "@/lib/pieces-jointes";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await accesAccidents();
  if (!a.ok) return a.refus;
  const { id } = await params;
  const at = await prisma.accidentTravail.findUnique({ where: { id }, select: { entrepriseId: true, salarie: { select: { etablissement: true } } } });
  if (!at || (!a.admin && (at.entrepriseId !== a.session.entrepriseId || !a.visible(at.salarie)))) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  return ajouterPieceJointe(request, { accidentId: id }, at.entrepriseId, a.session);
}
