import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notifierAdmin } from "@/lib/notifications";

/**
 * PUT
 *  admin  : { action: "repondre", montant, reponse } → ENVOYE ; { action: "statut", statut }
 *  client : { action: "accepter" | "refuser" } sur un devis ENVOYE ; { action: "annuler" } sur un devis EN_ATTENTE
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const corps = await request.json().catch(() => ({}));
  const d = await prisma.devis.findUnique({ where: { id }, include: { entreprise: { select: { nom: true } } } });
  if (!d) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });

  if (session.role === "ADMIN") {
    if (corps.action === "repondre") {
      const montant = Number(String(corps.montant ?? "").replace(",", "."));
      if (!Number.isFinite(montant) || montant < 0) return NextResponse.json({ erreur: "Montant invalide" }, { status: 400 });
      const devis = await prisma.devis.update({
        where: { id },
        data: { statut: "ENVOYE", montantPropose: Math.round(montant * 100) / 100, reponse: typeof corps.reponse === "string" ? corps.reponse.trim().slice(0, 3000) : null, reponduAt: new Date() },
      });
      return NextResponse.json({ succes: true, devis });
    }
    if (corps.action === "statut" && ["EN_ATTENTE", "ENVOYE", "ACCEPTE", "REFUSE", "ANNULE"].includes(corps.statut)) {
      const devis = await prisma.devis.update({ where: { id }, data: { statut: corps.statut } });
      return NextResponse.json({ succes: true, devis });
    }
    return NextResponse.json({ erreur: "Action inconnue" }, { status: 400 });
  }

  if (d.entrepriseId !== session.entrepriseId) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if ((corps.action === "accepter" || corps.action === "refuser") && d.statut === "ENVOYE") {
    const statut = corps.action === "accepter" ? "ACCEPTE" : "REFUSE";
    const devis = await prisma.devis.update({ where: { id }, data: { statut, decideAt: new Date() } });
    await notifierAdmin({
      sujet: `Devis ${statut === "ACCEPTE" ? "accepté" : "refusé"} — ${d.entreprise.nom}`,
      titre: statut === "ACCEPTE" ? "✅ Devis accepté" : "❌ Devis refusé",
      lignes: [`${d.entreprise.nom} a ${statut === "ACCEPTE" ? "accepté" : "refusé"} votre proposition de ${d.montantPropose ?? "?"} €.`],
      lien: "/admin/entreprises/devis",
      entrepriseId: d.entrepriseId,
    });
    return NextResponse.json({ succes: true, devis });
  }
  if (corps.action === "annuler" && d.statut === "EN_ATTENTE") {
    const devis = await prisma.devis.update({ where: { id }, data: { statut: "ANNULE" } });
    return NextResponse.json({ succes: true, devis });
  }
  return NextResponse.json({ erreur: "Action impossible sur ce devis." }, { status: 400 });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  await prisma.devis.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ succes: true });
}
