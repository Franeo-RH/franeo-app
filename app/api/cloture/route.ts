import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notifierAdmin, notifierClients } from "@/lib/notifications";
import { journaliser } from "@/lib/journal";
import { NOMS_MOIS } from "@/lib/heures";

/** GET ?mois=&annee= (client) ; admin : toutes les demandes en cours */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (session.role === "ADMIN") {
    const l = await prisma.clotureMois.findMany({ include: { entreprise: { select: { nom: true } } }, orderBy: { updatedAt: "desc" }, take: 200 });
    return NextResponse.json(l);
  }
  const p = request.nextUrl.searchParams;
  const mois = Number(p.get("mois")), annee = Number(p.get("annee"));
  const c = await prisma.clotureMois.findUnique({ where: { entrepriseId_annee_mois: { entrepriseId: session.entrepriseId!, annee, mois } } });
  return NextResponse.json(c);
}

/**
 * POST (client) { mois, annee, action: "cloturer" | "decloturer" } : demande à FRANEO RH de clôturer le mois
 * (plus aucune saisie attendue) ou de le rouvrir.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { mois, annee, action } = await request.json().catch(() => ({}));
  if (!(mois >= 1 && mois <= 12) || !(annee >= 2020) || (action !== "cloturer" && action !== "decloturer")) return NextResponse.json({ erreur: "Demande invalide" }, { status: 400 });
  const statut = action === "cloturer" ? "DEMANDE_CLOTURE" : "DEMANDE_DECLOTURE";
  const cle = { entrepriseId_annee_mois: { entrepriseId: session.entrepriseId, annee, mois } };
  await prisma.clotureMois.upsert({ where: cle, create: { entrepriseId: session.entrepriseId, mois, annee, statut, auteur: session.prenom }, update: { statut, auteur: session.prenom } });
  const periode = `${NOMS_MOIS[mois - 1]} ${annee}`;
  await journaliser(session.entrepriseId, session.prenom, action === "cloturer" ? "Demande de clôture" : "Demande de réouverture", periode);
  await notifierAdmin({
    sujet: `${action === "cloturer" ? "Clôture" : "Réouverture"} demandée — ${session.entreprise?.nom ?? ""} — ${periode}`,
    titre: action === "cloturer" ? "🔒 Demande de clôture du mois" : "🔓 Demande de réouverture du mois",
    lignes: [`${session.entreprise?.nom ?? ""} (${session.prenom}) : ${periode}`],
    lien: "/admin/paie/clotures",
    entrepriseId: session.entrepriseId,
  });
  return NextResponse.json({ succes: true, statut });
}

/** PUT (admin) { id, decision: "accepter" | "refuser" } */
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id, decision } = await request.json().catch(() => ({}));
  const c = await prisma.clotureMois.findUnique({ where: { id: String(id ?? "") } });
  if (!c) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  const periode = `${NOMS_MOIS[c.mois - 1]} ${c.annee}`;
  if (c.statut === "DEMANDE_CLOTURE") {
    if (decision === "accepter") await prisma.clotureMois.update({ where: { id: c.id }, data: { statut: "CLOTURE" } });
    else await prisma.clotureMois.delete({ where: { id: c.id } });
  } else if (c.statut === "DEMANDE_DECLOTURE") {
    if (decision === "accepter") await prisma.clotureMois.delete({ where: { id: c.id } });
    else await prisma.clotureMois.update({ where: { id: c.id }, data: { statut: "CLOTURE" } });
  } else if (c.statut === "CLOTURE" && decision === "refuser") {
    await prisma.clotureMois.delete({ where: { id: c.id } });
  }
  await journaliser(c.entrepriseId, "FRANEO RH", "Clôture", `${periode} : ${c.statut} → ${decision}`);
  await notifierClients(c.entrepriseId, { sujet: `Clôture ${periode}`, titre: "🔒 Clôture du mois", lignes: [`FRANEO RH a traité votre demande pour ${periode} (${decision === "accepter" ? "acceptée" : "refusée"}).`], lien: "/client/dashboard" });
  return NextResponse.json({ succes: true });
}
