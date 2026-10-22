// app/api/facturation/supprimer-mois/route.ts
// POST : supprime la facturation d'un mois pour un client (ou pour tous), sauf les factures déjà payées.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { entrepriseId, mois, annee } = await request.json();
  const moisInt = parseInt(mois);
  const anneeInt = parseInt(annee);
  if (!entrepriseId || !moisInt || !anneeInt) {
    return NextResponse.json({ erreur: "Champs obligatoires manquants" }, { status: 400 });
  }

  const cible = {
    mois: moisInt,
    annee: anneeInt,
    entreprise: { demo: false },
    ...(entrepriseId === "tous" ? {} : { entrepriseId }),
  };

  // Les factures déjà payées ne sont jamais supprimées
  const payees = await prisma.facturation.count({ where: { ...cible, statut: "Payé" } });
  const supprimees = await prisma.facturation.deleteMany({ where: { ...cible, statut: { not: "Payé" } } });

  return NextResponse.json({ succes: true, supprimees: supprimees.count, payeesIgnorees: payees });
}
