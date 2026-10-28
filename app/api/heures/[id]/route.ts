import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { fmtH, NOMS_MOIS } from "@/lib/heures";

/**
 * PUT { statut: "Validé" | "Refusé", motif? } : l'employeur (ou l'admin) valide ou refuse un relevé envoyé.
 * Validé : les heures supplémentaires du mois deviennent une variable de paie.
 * Refusé : le relevé est rouvert au salarié avec le motif.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const { statut, motif } = await request.json().catch(() => ({}));
  if (statut !== "Validé" && statut !== "Refusé") return NextResponse.json({ erreur: "Statut invalide" }, { status: 400 });

  const r = await prisma.releveMois.findUnique({ where: { id }, include: { jours: true } });
  if (!r) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  if (session.role === "CLIENT" && r.entrepriseId !== session.entrepriseId) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (r.statut !== "Envoyé") return NextResponse.json({ erreur: "Ce relevé n'est pas en attente de validation." }, { status: 400 });

  if (statut === "Refusé") {
    await prisma.releveMois.update({
      where: { id },
      data: { statut, motifRefus: typeof motif === "string" && motif.trim() ? motif.trim().slice(0, 300) : null },
    });
    return NextResponse.json({ succes: true });
  }

  const totS = Math.round(r.jours.reduce((a, j) => a + j.heuresSupp, 0) * 100) / 100;
  let variableId: string | null = null;
  if (totS > 0) {
    const v = await prisma.variablePaie.create({
      data: {
        salarieId: r.salarieId,
        entrepriseId: r.entrepriseId,
        type: "HEURE_SUPPLEMENTAIRE",
        valeur: totS,
        mois: r.mois,
        annee: r.annee,
        commentaire: `Relevé d'heures ${NOMS_MOIS[r.mois - 1]} ${r.annee} (${fmtH(totS)})`,
      },
    });
    variableId = v.id;
  }
  await prisma.releveMois.update({ where: { id }, data: { statut, valideAt: new Date(), motifRefus: null, variableId } });
  return NextResponse.json({ succes: true, variableId });
}
