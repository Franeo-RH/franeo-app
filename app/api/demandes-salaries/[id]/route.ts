import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { appliquerDemande } from "@/lib/demandes-salaries";

// Valider (la modification est appliquée) ou refuser une demande d'un client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const { action, motif } = await request.json();

  if (action === "valider") {
    const r = await appliquerDemande(id);
    if (r.erreur) return NextResponse.json({ erreur: r.erreur }, { status: 400 });
    return NextResponse.json({ succes: true });
  }

  if (action === "refuser") {
    const d = await prisma.demandeSalarie.findUnique({ where: { id } });
    if (!d) return NextResponse.json({ erreur: "Demande introuvable." }, { status: 404 });
    if (d.statut !== "EN_ATTENTE") return NextResponse.json({ erreur: "Cette demande a déjà été traitée." }, { status: 400 });
    await prisma.demandeSalarie.update({
      where: { id },
      data: { statut: "REFUSEE", traiteAt: new Date(), motifRefus: typeof motif === "string" && motif.trim() ? motif.trim().slice(0, 500) : null },
    });
    return NextResponse.json({ succes: true });
  }

  return NextResponse.json({ erreur: "Action inconnue." }, { status: 400 });
}
