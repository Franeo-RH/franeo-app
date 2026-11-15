import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notifierClients } from "@/lib/notifications";
import { STATUTS_DEMANDE, TYPES_DEMANDE } from "@/lib/apps-franeo";
import { oublierSessions } from "@/lib/session";

/** PUT (admin) { statut, reponse? } ; DELETE : le client annule une demande en attente (l'admin supprime) */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const { statut, reponse } = await request.json().catch(() => ({}));
  if (!STATUTS_DEMANDE[statut]) return NextResponse.json({ erreur: "Statut invalide" }, { status: 400 });
  const d = await prisma.demandeService.update({
    where: { id },
    data: { statut, reponse: typeof reponse === "string" && reponse.trim() ? reponse.trim().slice(0, 3000) : undefined, traiteeAt: statut === "TRAITEE" || statut === "REFUSEE" ? new Date() : null },
  });
  // Option Projets acceptée : le module est activé tout de suite (facturé 29 € HT/mois)
  if (d.type === "OPTION_PROJETS" && statut === "TRAITEE") {
    const e = await prisma.entreprise.findUnique({ where: { id: d.entrepriseId }, select: { permissions: true } });
    if (e && !e.permissions.includes("projets")) {
      await prisma.entreprise.update({ where: { id: d.entrepriseId }, data: { permissions: [...e.permissions, "projets"] } });
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
  await prisma.demandeService.delete({ where: { id } });
  return NextResponse.json({ succes: true });
}
