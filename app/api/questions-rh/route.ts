import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notifierAdmin } from "@/lib/notifications";
import { aDroit } from "@/lib/droits";

// GET : demandes RH ponctuelles (client : les siennes ; admin : toutes, filtres ?statut=&entrepriseId=)
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const p = request.nextUrl.searchParams;
  const questions = await prisma.questionRH.findMany({
    where: {
      ...(session.role === "ADMIN"
        ? { entreprise: { demo: false }, ...(p.get("entrepriseId") ? { entrepriseId: p.get("entrepriseId")! } : {}) }
        : { entrepriseId: session.entrepriseId ?? "-" }),
      ...(p.get("statut") ? { statut: p.get("statut")! } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { entreprise: { select: { nom: true } }, messages: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json(questions);
}

// POST (client) { sujet, contenu } : nouvelle question simple (non décomptée des tickets RH)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (session?.role === "CLIENT" && !aDroit(session.entreprise?.permissions, "tickets.questions")) return NextResponse.json({ erreur: "Action non autorisée pour votre compte. Contactez FRANEO RH." }, { status: 403 });
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { sujet, contenu } = await request.json().catch(() => ({}));
  if (typeof contenu !== "string" || !contenu.trim()) return NextResponse.json({ erreur: "Écrivez votre question." }, { status: 400 });
  const titre = (typeof sujet === "string" && sujet.trim() ? sujet.trim() : contenu.trim()).slice(0, 120);

  const q = await prisma.questionRH.create({
    data: {
      entrepriseId: session.entrepriseId,
      sujet: titre,
      auteur: session.prenom,
      messages: { create: { role: "CLIENT", auteur: session.prenom, contenu: contenu.trim().slice(0, 3000) } },
    },
    include: { entreprise: { select: { nom: true } } },
  });
  await notifierAdmin({
    sujet: `Demande RH ponctuelle — ${q.entreprise.nom}`,
    titre: "💬 Nouvelle demande RH ponctuelle",
    lignes: [`${q.entreprise.nom} (${session.prenom}) : ${titre}`, contenu.trim().slice(0, 400)],
    lien: "/admin/tickets/questions",
    entrepriseId: session.entrepriseId,
  });
  return NextResponse.json({ succes: true, question: q });
}
