import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Suspendre / réactiver une entreprise (les données sont conservées)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const { actif, motif } = await request.json();

  if (typeof actif !== "boolean") {
    return NextResponse.json({ erreur: "Statut invalide" }, { status: 400 });
  }

  const entreprise = await prisma.entreprise.findUnique({ where: { id } });
  if (!entreprise) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  if (entreprise.demo) {
    return NextResponse.json({ erreur: "L'entreprise de démonstration ne peut pas être suspendue." }, { status: 400 });
  }

  await prisma.entreprise.update({
    where: { id },
    data: {
      actif,
      motifSuspension: actif ? null : (typeof motif === "string" && motif.trim() ? motif.trim() : null),
      dateSuspension: actif ? null : new Date(),
    },
  });

  return NextResponse.json({ succes: true });
}
