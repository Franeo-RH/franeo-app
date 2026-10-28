import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notifierAdmin, notifierClients } from "@/lib/notifications";

// POST { contenu } : message dans l'échange d'un devis (client propriétaire ou admin)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const d = await prisma.devis.findUnique({ where: { id }, include: { entreprise: { select: { nom: true } } } });
  if (!d || (session.role === "CLIENT" && d.entrepriseId !== session.entrepriseId)) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  const { contenu } = await request.json().catch(() => ({}));
  if (typeof contenu !== "string" || !contenu.trim()) return NextResponse.json({ erreur: "Message vide" }, { status: 400 });

  const message = await prisma.messageDevis.create({
    data: { devisId: id, role: session.role === "ADMIN" ? "ADMIN" : "CLIENT", auteur: session.prenom, contenu: contenu.trim().slice(0, 3000) },
  });
  const extrait = contenu.trim().slice(0, 300);
  if (session.role === "ADMIN") {
    await notifierClients(d.entrepriseId, { sujet: "Nouveau message sur votre demande de devis", titre: "💬 Message de FRANEO RH", lignes: [extrait], lien: "/client/entreprise/devis" });
  } else {
    await notifierAdmin({ sujet: `Message sur un devis — ${d.entreprise.nom}`, titre: "💬 Nouveau message sur un devis", lignes: [`${d.entreprise.nom} : ${extrait}`], lien: "/admin/entreprises/devis", entrepriseId: d.entrepriseId });
  }
  return NextResponse.json({ succes: true, message });
}
