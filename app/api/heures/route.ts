import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { chargerReleve } from "@/lib/releves";

// GET ?statut=Envoyé|tout : relevés mensuels envoyés par les salariés (client : son entreprise ; admin : toutes)
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const statut = request.nextUrl.searchParams.get("statut") || "Envoyé";
  const releves = await prisma.releveMois.findMany({
    where: {
      ...(session.role === "ADMIN" ? {} : { entrepriseId: session.entrepriseId ?? "-" }),
      ...(statut === "tout" ? { statut: { not: "Brouillon" } } : { statut }),
    },
    orderBy: [{ annee: "desc" }, { mois: "desc" }, { envoyeAt: "desc" }],
    take: 100,
    include: { salarie: { select: { prenom: true, nom: true } }, entreprise: { select: { nom: true } } },
  });
  const details = await Promise.all(releves.map((r) => chargerReleve(r.salarieId, r.mois, r.annee)));
  return NextResponse.json(
    releves.map((r, i) => ({ id: r.id, salarie: r.salarie, entreprise: r.entreprise, ...details[i] }))
  );
}
