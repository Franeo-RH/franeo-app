import { NextRequest, NextResponse } from "next/server";
import { lireFichierStocke, supprimerFichierStocke } from "@/lib/stockage";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { telecharger } from "@/lib/fichiers";

async function charger(id: string) {
  const session = await getSession();
  if (!session) return { session: null, doc: null };
  const doc = await prisma.document.findUnique({ where: { id }, include: { salarie: { select: { entrepriseId: true } } } });
  if (!doc || (session.role === "CLIENT" && (doc.salarie.entrepriseId !== session.entrepriseId || !aDroit(session.entreprise?.permissions, "rh.documents")))) return { session, doc: null };
  return { session, doc };
}

/** GET : télécharge le document (?voir=1 pour l'ouvrir dans le navigateur) */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, doc } = await charger(id);
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const contenu = doc ? await lireFichierStocke(doc) : null;
  if (!doc || !contenu) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  const enLigne = request.nextUrl.searchParams.get("voir") === "1" && /^(application\/pdf|image\/)/.test(doc.mime || "");
  return telecharger(contenu, doc.nom, doc.mime || "application/octet-stream", enLigne);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, doc } = await charger(id);
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (!doc) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  await prisma.document.delete({ where: { id } });
  await supprimerFichierStocke(doc.cle);
  return NextResponse.json({ succes: true });
}
