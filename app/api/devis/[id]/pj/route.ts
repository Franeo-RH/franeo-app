import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { ajouterPieceJointe } from "@/lib/pieces-jointes";
import { notifierAdmin, notifierClients } from "@/lib/notifications";

/** POST (formulaire, champ « fichier ») : document joint à un devis (le devis PDF déposé par l'admin, une pièce du client…) */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const d = await prisma.devis.findUnique({ where: { id }, select: { entrepriseId: true, entreprise: { select: { nom: true } } } });
  if (!d || (session.role !== "ADMIN" && d.entrepriseId !== session.entrepriseId)) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  const rep = await ajouterPieceJointe(request, { devisId: id }, d.entrepriseId, session);
  if (rep.ok) {
    if (session.role === "ADMIN") await notifierClients(d.entrepriseId, { sujet: "Nouveau document sur votre demande de devis", titre: "📎 Document de FRANEO RH", lignes: ["Un document a été déposé sur votre demande de devis."], lien: "/client/entreprise/devis" });
    else await notifierAdmin({ sujet: `Document sur un devis — ${d.entreprise.nom}`, titre: "📎 Nouveau document sur un devis", lignes: [`${d.entreprise.nom} a joint un document.`], lien: "/admin/entreprises/devis", entrepriseId: d.entrepriseId });
  }
  return rep;
}
