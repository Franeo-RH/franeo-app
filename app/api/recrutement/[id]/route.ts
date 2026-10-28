import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * PUT (admin) { action, candidat?, date? }
 *   action = "demarrer" | "signature" | "fin-essai" | "annuler" | "rouvrir" | "statut" (avec { statut })
 * « signature » et « fin-essai » déclenchent les primes, facturées le mois de la date indiquée (aujourd'hui par défaut).
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const corps = await request.json().catch(() => ({}));
  const r = await prisma.demandeRecrutement.findUnique({ where: { id } });
  if (!r) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });

  const date = corps.date && !Number.isNaN(new Date(corps.date).getTime()) ? new Date(corps.date) : new Date();
  const candidat = typeof corps.candidat === "string" && corps.candidat.trim() ? corps.candidat.trim().slice(0, 120) : undefined;
  let data: Record<string, unknown>;

  switch (corps.action ?? (corps.statut ? "statut" : "")) {
    case "demarrer":
      data = { statut: "En cours" };
      break;
    case "signature":
      if (r.signatureAt) return NextResponse.json({ erreur: "La prime de signature a déjà été déclenchée." }, { status: 400 });
      data = { statut: "Contrat signé", signatureAt: date, ...(candidat ? { candidat } : {}) };
      break;
    case "fin-essai":
      if (!r.signatureAt) return NextResponse.json({ erreur: "Déclenchez d'abord la prime de signature du contrat." }, { status: 400 });
      if (r.finEssaiAt) return NextResponse.json({ erreur: "La prime de fin de période d'essai a déjà été déclenchée." }, { status: 400 });
      data = { statut: "Terminé", finEssaiAt: date, termineAt: date };
      break;
    case "annuler":
      data = { statut: "Annulé", termineAt: new Date() };
      break;
    case "rouvrir":
      data = { statut: r.signatureAt ? "Contrat signé" : "En cours", termineAt: null };
      break;
    case "statut":
      data = { statut: String(corps.statut) };
      break;
    default:
      return NextResponse.json({ erreur: "Action inconnue" }, { status: 400 });
  }

  const recrutement = await prisma.demandeRecrutement.update({ where: { id }, data });
  return NextResponse.json({ succes: true, recrutement });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  await prisma.demandeRecrutement.delete({ where: { id } });
  return NextResponse.json({ succes: true });
}
