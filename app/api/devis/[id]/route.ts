import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notifierAdmin, notifierClients } from "@/lib/notifications";
import { facturer, libelleMois, lireMois, lireMontant, retirerFacturation } from "@/lib/facturer-demande";
import { supprimerFichiersDe } from "@/lib/pieces-jointes";

/**
 * PUT
 *  admin  : { action: "repondre", montant, reponse } → ENVOYE ; { action: "statut", statut }
 *           { action: "facturer", montant, mois, annee } → ACCEPTE + montant ajouté à la facture du mois ; { action: "retirerFacture" }
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
    if (corps.action === "facturer") {
      const montant = lireMontant(corps.montant);
      const periode = lireMois(corps.mois, corps.annee);
      if (!montant) return NextResponse.json({ erreur: "Montant invalide" }, { status: 400 });
      if (!periode) return NextResponse.json({ erreur: "Mois invalide" }, { status: 400 });
      const libelle = `Devis validé du ${d.createdAt.toLocaleDateString("fr-FR")}`;
      const commandeId = await facturer({ entrepriseId: d.entrepriseId, commandeId: d.commandeId, code: "DEVIS", libelle, montant, ...periode, auteur: "FRANEO RH" });
      const devis = await prisma.devis.update({
        where: { id },
        data: { statut: "ACCEPTE", decideAt: d.decideAt ?? new Date(), commandeId, montantFacture: montant, factureMois: periode.mois, factureAnnee: periode.annee },
      });
      await notifierClients(d.entrepriseId, {
        sujet: "Votre devis est validé",
        titre: "✅ Devis validé",
        lignes: [`Montant : ${montant.toLocaleString("fr-FR")} € HT, ajouté à votre facture de ${libelleMois(periode.mois, periode.annee)}.`],
        lien: "/client/entreprise/devis",
      });
      return NextResponse.json({ succes: true, devis });
    }
    if (corps.action === "retirerFacture") {
      await retirerFacturation(d.commandeId);
      const devis = await prisma.devis.update({ where: { id }, data: { commandeId: null, montantFacture: null, factureMois: null, factureAnnee: null } });
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
  const d = await prisma.devis.findUnique({ where: { id }, select: { commandeId: true } });
  if (d) {
    await retirerFacturation(d.commandeId);
    await supprimerFichiersDe({ devisId: id });
  }
  await prisma.devis.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ succes: true });
}
