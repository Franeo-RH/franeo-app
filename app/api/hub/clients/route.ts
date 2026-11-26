import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appelDuPortail } from "@/lib/hub";
import { montantsMois } from "@/lib/facturation";

export const dynamic = "force-dynamic";

/** GET (portail) : tous les clients (hors démo), pour la liste native du portail */
export async function GET(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const now = new Date();
  const [entreprises, salaries, impayes] = await Promise.all([
    prisma.entreprise.findMany({
      where: { demo: false },
      select: { id: true, nom: true, siret: true, email: true, telephone: true, ville: true, actif: true, motifSuspension: true, createdAt: true,
        abonnement: { select: { nom: true } }, abonnementPaie: { select: { nom: true } }, cabinet: { select: { nom: true } }, _count: { select: { utilisateurs: true } } },
      orderBy: { nom: "asc" },
    }),
    prisma.salarie.groupBy({ by: ["entrepriseId"], where: { entreprise: { demo: false }, OR: [{ dateFin: null }, { dateFin: { gte: now } }] }, _count: { _all: true } }),
    prisma.facturation.groupBy({ by: ["entrepriseId"], where: { statut: { not: "Payé" }, entreprise: { demo: false } }, _sum: { montant: true } }),
  ]);
  const ca = await montantsMois(now.getMonth() + 1, now.getFullYear(), entreprises.filter((e) => e.actif).map((e) => e.id)).catch(() => new Map<string, number>());
  return NextResponse.json({
    clients: entreprises.map((e) => ({
      id: e.id, nom: e.nom, siret: e.siret, email: e.email, telephone: e.telephone, ville: e.ville, actif: e.actif, motif: e.motifSuspension, creeLe: e.createdAt,
      offre: [e.abonnementPaie?.nom, e.abonnement?.nom].filter(Boolean).join(" · ") || (e.cabinet ? `Client du cabinet ${e.cabinet.nom}` : "Sans formule"),
      salaries: salaries.find((s) => s.entrepriseId === e.id)?._count._all ?? 0, comptes: e._count.utilisateurs,
      caMois: Math.round((ca.get(e.id) ?? 0) * 100) / 100, impaye: Math.round((impayes.find((x) => x.entrepriseId === e.id)?._sum.montant ?? 0) * 100) / 100,
    })),
  });
}
