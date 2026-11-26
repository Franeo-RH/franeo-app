import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appelDuPortail } from "@/lib/hub";
import { lignesFacturesMois, totalLignes } from "@/lib/facturation";

export const dynamic = "force-dynamic";

/**
 * GET ?mois=2027-01 (portail, clé HUB_SECRET) : factures du mois de chaque client, ligne par ligne
 * (abonnements, options, suppléments, prestations, puis remises et codes promo déduits), à reporter dans Abby.
 */
export async function GET(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const m = /^(\d{4})-(\d{2})$/.exec(request.nextUrl.searchParams.get("mois") || "");
  const now = new Date();
  const annee = m ? Number(m[1]) : now.getFullYear(), mois = m ? Number(m[2]) : now.getMonth() + 1;
  const entreprises = await prisma.entreprise.findMany({ where: { demo: false, actif: true }, select: { id: true, nom: true } });
  const ids = entreprises.map((e) => e.id);
  const [lignes, generees] = await Promise.all([
    lignesFacturesMois(mois, annee, ids),
    prisma.facturation.findMany({ where: { mois, annee, entrepriseId: { in: ids } }, select: { entrepriseId: true, montant: true, statut: true } }),
  ]);
  const factures = entreprises.map((e) => {
    const l = lignes.get(e.id) ?? [];
    const g = generees.find((x) => x.entrepriseId === e.id);
    return {
      clientId: e.id, client: e.nom,
      lignes: l.map((x) => ({ libelle: x.libelle, quantite: x.quantite, prixUnitaire: x.prixUnitaire, total: x.total, remise: x.categorie === "REMISE" || x.total < 0 })),
      total: Math.round((g?.montant ?? totalLignes(l)) * 100) / 100,
      generee: !!g, statut: g?.statut ?? null,
    };
  }).filter((f) => f.total > 0 || f.lignes.length > 0);
  return NextResponse.json({ mois: `${annee}-${String(mois).padStart(2, "0")}`, factures });
}
