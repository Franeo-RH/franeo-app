import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { motsClesDe, normaliser } from "@/lib/buddy/apprentissage";

/** GET ?statut= (admin) : questions posées à Buddy restées sans réponse, ou réponses déjà rédigées */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const statut = request.nextUrl.searchParams.get("statut") || "A_TRAITER";
  const l = await prisma.buddyQuestion.findMany({ where: { statut }, orderBy: [{ occurrences: "desc" }, { updatedAt: "desc" }], take: 300 });
  const ids = [...new Set(l.flatMap((q) => q.entreprises))];
  const ents = await prisma.entreprise.findMany({ where: { id: { in: ids } }, select: { id: true, nom: true } });
  return NextResponse.json(l.map((q) => ({ ...q, entreprisesNoms: q.entreprises.map((id) => ents.find((e) => e.id === id)?.nom).filter(Boolean) })));
}

/** POST (admin) { question, reponse, motsCles? } : ajoute directement une réponse à Buddy */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const question = String(b.question || "").trim().slice(0, 500);
  const reponse = String(b.reponse || "").trim().slice(0, 3000);
  if (!question || !reponse) return NextResponse.json({ erreur: "Question et réponse obligatoires." }, { status: 400 });
  const motsCles = Array.isArray(b.motsCles) && b.motsCles.length ? (b.motsCles as unknown[]).map((m) => normaliser(String(m))).filter(Boolean).slice(0, 12) : motsClesDe(question);
  const normalisee = normaliser(question).slice(0, 300);
  await prisma.buddyQuestion.upsert({
    where: { normalisee },
    create: { question, normalisee, motsCles, reponse, statut: "REPONDUE", entreprises: [] },
    update: { reponse, motsCles, statut: "REPONDUE" },
  });
  return NextResponse.json({ succes: true });
}
