import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/** GET (client) : questions posées par les salariés dans leur espace (suivi par la direction) */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const questions = await prisma.questionInterne.findMany({
    where: { entrepriseId: session.entrepriseId ?? "-" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  const ids = [...new Set(questions.flatMap((q) => [q.auteurId, q.destinataireId].filter(Boolean) as string[]))];
  const noms = await prisma.salarie.findMany({ where: { id: { in: ids } }, select: { id: true, prenom: true, nom: true } });
  const nom = (id: string | null) => { const n = id ? noms.find((x) => x.id === id) : null; return n ? `${n.prenom} ${n.nom}` : null; };
  return NextResponse.json(questions.map((q) => ({ ...q, auteurNom: nom(q.auteurId) ?? "—", destinataireNom: q.versFraneo ? "FRANEO RH" : nom(q.destinataireId) ?? "Direction" })));
}
