import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { mois, annee, entrepriseId, ids } = await request.json();

  // Validation d'une liste précise de variables (boutons « Tout valider »)
  if (Array.isArray(ids)) {
    const liste = ids.filter((i: unknown): i is string => typeof i === "string").slice(0, 1000);
    if (liste.length === 0) return NextResponse.json({ succes: true, valides: 0 });
    const res = await prisma.variablePaie.updateMany({
      where: { id: { in: liste }, statut: "En attente" },
      data: { statut: "Validé", dateValidation: new Date() },
    });
    return NextResponse.json({ succes: true, valides: res.count });
  }

  // Validation d'un mois pour une entreprise
  const res = await prisma.variablePaie.updateMany({
    where: { mois, annee, entrepriseId, statut: "En attente" },
    data: { statut: "Validé", dateValidation: new Date() },
  });

  return NextResponse.json({ succes: true, valides: res.count });
}
