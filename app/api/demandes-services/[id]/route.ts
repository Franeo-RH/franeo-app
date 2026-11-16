import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notifierClients } from "@/lib/notifications";
import { STATUTS_DEMANDE, TYPES_DEMANDE } from "@/lib/apps-franeo";
import { oublierSessions } from "@/lib/session";
import { facturer, libelleMois, lireMois, lireMontant, retirerFacturation } from "@/lib/facturer-demande";
import { supprimerFichiersDe } from "@/lib/pieces-jointes";

/**
 * PUT (admin) { statut, reponse? }
 *   ou { action: "facturer", montant, mois, annee } : demande validée, montant ajouté à la facture du mois
 *   ou { action: "retirerFacture" }
 * DELETE : le client annule une demande en attente (l'admin supprime) */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const corps = await request.json().catch(() => ({}));
  if (corps.action === "facturer" || corps.action === "retirerFacture") {
    const dem = await prisma.demandeService.findUnique({ where: { id } });
    if (!dem) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
    if (corps.action === "retirerFacture") {
      await retirerFacturation(dem.commandeId);
      await prisma.demandeService.update({ where: { id }, data: { commandeId: null, montantFacture: null, factureMois: null, factureAnnee: null } });
      return NextResponse.json({ succes: true });
    }
    const montant = lireMontant(corps.montant);
    const periode = lireMois(corps.mois, corps.annee);
    if (!montant) return NextResponse.json({ erreur: "Montant invalide" }, { status: 400 });
    if (!periode) return NextResponse.json({ erreur: "Mois invalide" }, { status: 400 });
    const libelle = `${TYPES_DEMANDE[dem.type]?.label ?? "Demande complémentaire"}${dem.app ? ` (${dem.app})` : ""} — demande du ${dem.createdAt.toLocaleDateString("fr-FR")}`;
    const commandeId = await facturer({ entrepriseId: dem.entrepriseId, commandeId: dem.commandeId, code: "DEMANDE", libelle, montant, ...periode, auteur: "FRANEO RH" });
    await prisma.demandeService.update({
      where: { id },
      data: { statut: "TRAITEE", traiteeAt: dem.traiteeAt ?? new Date(), commandeId, montantFacture: montant, factureMois: periode.mois, factureAnnee: periode.annee },
    });
    await notifierClients(dem.entrepriseId, {
      sujet: `Votre demande est validée : ${TYPES_DEMANDE[dem.type]?.label ?? dem.type}`,
      titre: "✅ Demande validée",
      lignes: [`Montant : ${montant.toLocaleString("fr-FR")} € HT, ajouté à votre facture de ${libelleMois(periode.mois, periode.annee)}.`],
      lien: "/client/entreprise/devis",
    });
    return NextResponse.json({ succes: true });
  }
  const { statut, reponse } = corps;
  if (!STATUTS_DEMANDE[statut]) return NextResponse.json({ erreur: "Statut invalide" }, { status: 400 });
  const d = await prisma.demandeService.update({
    where: { id },
    data: { statut, reponse: typeof reponse === "string" && reponse.trim() ? reponse.trim().slice(0, 3000) : undefined, traiteeAt: statut === "TRAITEE" || statut === "REFUSEE" ? new Date() : null },
  });
  // Option acceptée : activée tout de suite (facturée selon la formule, voir lib/facturation.ts)
  if ((d.type === "OPTION_PROJETS" || d.type === "OPTION_DOCUMENTS") && statut === "TRAITEE") {
    const e = await prisma.entreprise.findUnique({ where: { id: d.entrepriseId }, select: { permissions: true } });
    const perm = d.type === "OPTION_PROJETS" ? "projets" : "option-documents";
    if (e && !e.permissions.includes(perm)) {
      // Documents : on rend aussi les contrats et courriers s'ils avaient été retirés
      const perms = d.type === "OPTION_DOCUMENTS" ? e.permissions.filter((p) => p !== "-rh.contrats" && p !== "-rh.courriers") : e.permissions;
      await prisma.entreprise.update({ where: { id: d.entrepriseId }, data: { permissions: [...perms, perm] } });
      oublierSessions();
    }
  }
  await notifierClients(d.entrepriseId, {
    sujet: `Votre demande : ${TYPES_DEMANDE[d.type]?.label ?? d.type}`,
    titre: "📬 Votre demande a été mise à jour",
    lignes: [`Statut : ${STATUTS_DEMANDE[statut].label}`, ...(d.reponse ? [d.reponse] : [])],
    lien: "/client/entreprise/devis",
  });
  return NextResponse.json({ succes: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const d = await prisma.demandeService.findUnique({ where: { id } });
  if (!d || (session.role === "CLIENT" && (d.entrepriseId !== session.entrepriseId || d.statut !== "EN_ATTENTE"))) return NextResponse.json({ erreur: "Introuvable ou déjà prise en charge" }, { status: 404 });
  await retirerFacturation(d.commandeId);
  await supprimerFichiersDe({ demandeServiceId: id });
  await prisma.demandeService.delete({ where: { id } });
  return NextResponse.json({ succes: true });
}
