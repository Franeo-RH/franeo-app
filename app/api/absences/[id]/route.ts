import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";

const STATUTS = ["En attente", "Validé", "Refusé"];

// Valider / refuser une absence
// - l'admin : toutes les absences ;
// - le client (employeur) : les absences déclarées par ses salariés depuis leur espace.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (session?.role === "CLIENT" && !aDroit(session.entreprise?.permissions, "absences.valider")) return NextResponse.json({ erreur: "Action non autorisée pour votre compte. Contactez FRANEO RH." }, { status: 403 });
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const { statut, motif } = await request.json();
  if (!STATUTS.includes(statut)) return NextResponse.json({ erreur: "Statut invalide" }, { status: 400 });

  const existante = await prisma.absence.findUnique({ where: { id } });
  if (!existante) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });

  if (session.role !== "ADMIN") {
    if (existante.entrepriseId !== session.entrepriseId || !existante.declareeParSalarie) {
      return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
    }
  }

  const absence = await prisma.absence.update({
    where: { id },
    data: {
      statut,
      motifRefus: statut === "Refusé" && typeof motif === "string" && motif.trim() ? motif.trim().slice(0, 500) : null,
    },
  });

  return NextResponse.json({ succes: true, absence });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  // Sécurité : un client ne peut supprimer que les absences de son entreprise
  const absence = await prisma.absence.findUnique({ where: { id }, select: { entrepriseId: true } });
  if (!absence) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  if (session.role !== "ADMIN" && absence.entrepriseId !== session.entrepriseId) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  await prisma.absence.delete({ where: { id } });

  return NextResponse.json({ succes: true });
}
