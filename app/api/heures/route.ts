import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { chargerReleve } from "@/lib/releves";

/**
 * GET : relevés d'heures (client : son entreprise ; admin : toutes)
 *   statut = Envoyé | Validé | Refusé | Brouillon | tout (tous sauf brouillons) | toutes (y compris brouillons)
 *   mois = AAAA-MM (facultatif) · entrepriseId (admin, facultatif)
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const p = request.nextUrl.searchParams;
  const statut = p.get("statut") || "Envoyé";
  const filtreMois = /^\d{4}-\d{2}$/.test(p.get("mois") || "") ? p.get("mois")!.split("-").map(Number) : null;
  const entrepriseFiltre = session.role === "ADMIN" ? p.get("entrepriseId") || undefined : session.entrepriseId ?? "-";

  const releves = await prisma.releveMois.findMany({
    where: {
      ...(entrepriseFiltre ? { entrepriseId: entrepriseFiltre } : {}),
      ...(statut === "toutes" ? {} : statut === "tout" ? { statut: { not: "Brouillon" } } : { statut }),
      ...(filtreMois ? { annee: filtreMois[0], mois: filtreMois[1] } : {}),
    },
    orderBy: [{ annee: "desc" }, { mois: "desc" }, { envoyeAt: "desc" }],
    take: 200,
    include: { salarie: { select: { prenom: true, nom: true } }, entreprise: { select: { nom: true } } },
  });
  const details = await Promise.all(releves.map((r) => chargerReleve(r.salarieId, r.mois, r.annee)));
  return NextResponse.json(
    releves.map((r, i) => ({ id: r.id, salarie: r.salarie, entreprise: r.entreprise, valideAt: r.valideAt, ...details[i] }))
  );
}
