import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/** PUT (admin) : récompense automatique du parrainage { type: AUCUNE|POURCENT|MONTANT, valeur, mois, pour: PARRAIN|FILLEUL|LES_DEUX } */
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const type = ["AUCUNE", "POURCENT", "MONTANT"].includes(b.type) ? b.type : "AUCUNE";
  const valeur = type === "AUCUNE" ? 0 : parseFloat(String(b.valeur ?? "").replace(",", "."));
  const mois = parseInt(String(b.mois ?? "1"), 10);
  if (type !== "AUCUNE" && (!Number.isFinite(valeur) || valeur <= 0 || (type === "POURCENT" && valeur > 100))) {
    return NextResponse.json({ erreur: "Valeur de remise invalide." }, { status: 400 });
  }
  if (!Number.isFinite(mois) || mois < 1 || mois > 24) return NextResponse.json({ erreur: "Durée : 1 à 24 mois." }, { status: 400 });
  const data = {
    parrainageType: type,
    parrainageValeur: valeur,
    parrainageMois: mois,
    parrainagePour: ["PARRAIN", "FILLEUL", "LES_DEUX"].includes(b.pour) ? b.pour : "PARRAIN",
  };
  await prisma.reglageApp.upsert({ where: { id: "global" }, create: { id: "global", ...data }, update: data });
  return NextResponse.json({ succes: true });
}
