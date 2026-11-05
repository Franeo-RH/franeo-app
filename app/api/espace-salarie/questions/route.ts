import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionSalarie } from "@/lib/session";
import { destinataireN1 } from "@/lib/hierarchie";

/** GET : questions posées par moi et questions reçues (je suis le destinataire) */
export async function GET() {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  const questions = await prisma.questionInterne.findMany({
    where: { OR: [{ auteurId: s.salarie.id }, { destinataireId: s.salarie.id, versFraneo: false }] },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  const ids = [...new Set(questions.flatMap((q) => [q.auteurId, q.destinataireId].filter(Boolean) as string[]))];
  const noms = await prisma.salarie.findMany({ where: { id: { in: ids } }, select: { id: true, prenom: true, nom: true } });
  const nom = (id: string | null) => (id ? noms.find((n) => n.id === id) : null);
  return NextResponse.json(questions.map((q) => ({
    ...q,
    moiAuteur: q.auteurId === s.salarie.id,
    auteurNom: nom(q.auteurId) ? `${nom(q.auteurId)!.prenom} ${nom(q.auteurId)!.nom}` : "—",
    destinataireNom: q.versFraneo ? "FRANEO RH" : nom(q.destinataireId) ? `${nom(q.destinataireId)!.prenom} ${nom(q.destinataireId)!.nom}` : "Direction",
  })));
}

/** POST { sujet, contenu } : question à mon N+1 (ou à la direction si je n'ai pas de manager) */
export async function POST(request: NextRequest) {
  const s = await getSessionSalarie();
  if (!s.ok) return NextResponse.json({ erreur: "Accès refusé" }, { status: 401 });
  const { sujet, contenu } = await request.json().catch(() => ({}));
  if (typeof contenu !== "string" || !contenu.trim()) return NextResponse.json({ erreur: "Écrivez votre question." }, { status: 400 });
  const q = await prisma.questionInterne.create({
    data: {
      entrepriseId: s.utilisateur.entrepriseId!,
      auteurId: s.salarie.id,
      destinataireId: await destinataireN1(s.salarie.id),
      sujet: (typeof sujet === "string" && sujet.trim() ? sujet.trim() : contenu.trim()).slice(0, 120),
      messages: { create: { auteur: `${s.salarie.prenom} ${s.salarie.nom}`, contenu: contenu.trim().slice(0, 3000) } },
    },
  });
  return NextResponse.json({ succes: true, question: q });
}
