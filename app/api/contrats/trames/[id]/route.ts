import { NextRequest, NextResponse } from "next/server";
import { lireFichierStocke, supprimerFichierStocke } from "@/lib/stockage";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { telecharger } from "@/lib/fichiers";

async function charger(id: string) {
  const session = await getSession();
  if (!session) return null;
  const t = await prisma.trameContrat.findUnique({ where: { id } });
  if (!t || (session.role === "CLIENT" && t.entrepriseId !== session.entrepriseId)) return null;
  return t;
}

/** GET : le fichier .docx du modèle (utilisé pour générer le contrat dans le navigateur) */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await charger((await params).id);
  if (!t) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  const contenu = await lireFichierStocke({ cle: t.cle, contenu: t.fichier });
  if (!contenu) return NextResponse.json({ erreur: "Fichier introuvable" }, { status: 404 });
  return telecharger(contenu, `${t.nom}.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await charger(id);
  if (!t) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  await prisma.trameContrat.delete({ where: { id } });
  await supprimerFichierStocke(t.cle);
  return NextResponse.json({ succes: true });
}
