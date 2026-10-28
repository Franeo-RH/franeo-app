import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notifierAdmin, notifierClients } from "@/lib/notifications";

async function charger(id: string) {
  const session = await getSession();
  if (!session) return { erreur: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  const q = await prisma.questionRH.findUnique({ where: { id }, include: { entreprise: { select: { nom: true } } } });
  if (!q || (session.role === "CLIENT" && q.entrepriseId !== session.entrepriseId)) return { erreur: NextResponse.json({ erreur: "Introuvable" }, { status: 404 }) };
  return { session, q };
}

// POST { contenu, versTicket? } : réponse dans l'échange
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await charger(id);
  if (r.erreur) return r.erreur;
  const { session, q } = r;
  const { contenu, versTicket } = await request.json().catch(() => ({}));
  if (typeof contenu !== "string" || !contenu.trim()) return NextResponse.json({ erreur: "Message vide" }, { status: 400 });
  if (q.statut === "CLOSE" && session.role === "CLIENT") return NextResponse.json({ erreur: "Cette demande est close." }, { status: 400 });

  const admin = session.role === "ADMIN";
  const message = await prisma.messageQuestionRH.create({
    data: { questionId: id, role: admin ? "ADMIN" : "CLIENT", auteur: session.prenom, contenu: contenu.trim().slice(0, 3000), versTicket: admin && versTicket === true },
  });
  await prisma.questionRH.update({
    where: { id },
    data: { statut: admin ? (versTicket === true ? "TICKET" : "REPONDUE") : "OUVERTE" },
  });
  const extrait = contenu.trim().slice(0, 300);
  if (admin) {
    await notifierClients(q.entrepriseId, { sujet: `Réponse à votre demande : ${q.sujet}`, titre: "💬 Réponse de FRANEO RH", lignes: [extrait], lien: "/client/tickets/questions" });
  } else {
    await notifierAdmin({ sujet: `Demande RH ponctuelle — ${q.entreprise.nom}`, titre: "💬 Nouveau message", lignes: [`${q.entreprise.nom} : ${extrait}`], lien: "/admin/tickets/questions", entrepriseId: q.entrepriseId });
  }
  return NextResponse.json({ succes: true, message });
}

// PUT { statut: "CLOSE" | "OUVERTE" } : clore ou rouvrir
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await charger(id);
  if (r.erreur) return r.erreur;
  const { statut } = await request.json().catch(() => ({}));
  if (statut !== "CLOSE" && statut !== "OUVERTE") return NextResponse.json({ erreur: "Statut invalide" }, { status: 400 });
  await prisma.questionRH.update({ where: { id }, data: { statut } });
  return NextResponse.json({ succes: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await charger(id);
  if (r.erreur) return r.erreur;
  if (r.session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  await prisma.questionRH.delete({ where: { id } });
  return NextResponse.json({ succes: true });
}
