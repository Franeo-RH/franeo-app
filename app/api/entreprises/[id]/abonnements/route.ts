import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notifierClients } from "@/lib/notifications";

/**
 * PUT (admin) { abonnementId, abonnementPaieId, prevenir? } : modification forcée des abonnements d'une entreprise,
 * sans demande du client. Une valeur vide retire l'abonnement. Effet immédiat sur la facturation du mois.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const corps = await request.json().catch(() => ({}));

  const avant = await prisma.entreprise.findUnique({ where: { id }, include: { abonnement: true, abonnementPaie: true } });
  if (!avant) return NextResponse.json({ erreur: "Entreprise introuvable" }, { status: 404 });

  const abonnementId = corps.abonnementId ? String(corps.abonnementId) : null;
  const abonnementPaieId = corps.abonnementPaieId ? String(corps.abonnementPaieId) : null;
  const [rh, paie] = await Promise.all([
    abonnementId ? prisma.abonnement.findUnique({ where: { id: abonnementId } }) : Promise.resolve(null),
    abonnementPaieId ? prisma.abonnementPaie.findUnique({ where: { id: abonnementPaieId } }) : Promise.resolve(null),
  ]);
  if (abonnementId && !rh) return NextResponse.json({ erreur: "Pack RH introuvable" }, { status: 400 });
  if (abonnementPaieId && !paie) return NextResponse.json({ erreur: "Formule paie introuvable" }, { status: 400 });

  await prisma.entreprise.update({ where: { id }, data: { abonnementId, abonnementPaieId } });

  const changements: string[] = [];
  if (avant.abonnementId !== abonnementId) changements.push(`Pack RH : ${avant.abonnement?.nom ?? "aucun"} → ${rh?.nom ?? "aucun"}`);
  if (avant.abonnementPaieId !== abonnementPaieId) changements.push(`Formule paie : ${avant.abonnementPaie?.nom ?? "aucune"} → ${paie?.nom ?? "aucune"}`);

  if (corps.prevenir !== false && changements.length > 0) {
    await notifierClients(id, {
      sujet: "Vos abonnements FRANEO RH ont été mis à jour",
      titre: "📦 Mise à jour de vos abonnements",
      lignes: [...changements, "La modification s'applique dès la facture de ce mois."],
      lien: "/client/entreprise/abonnement",
    });
  }
  return NextResponse.json({ succes: true, changements });
}
