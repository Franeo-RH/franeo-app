import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appelDuPortail } from "@/lib/hub";
import { appelInterne } from "@/lib/hub-interne";
import { SOURCES_BUDDY } from "@/lib/buddy/sources-liste";

export const dynamic = "force-dynamic";

/** GET (portail) ?statut=A_TRAITER|REPONDUE|IGNOREE : questions posées à Buddy, avec les clients qui les ont posées */
export async function GET(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const statut = ["A_TRAITER", "REPONDUE", "IGNOREE"].includes(request.nextUrl.searchParams.get("statut") ?? "") ? request.nextUrl.searchParams.get("statut")! : "A_TRAITER";
  const [l, compteurs] = await Promise.all([
    prisma.buddyQuestion.findMany({ where: { statut }, orderBy: [{ occurrences: "desc" }, { updatedAt: "desc" }], take: 300 }),
    prisma.buddyQuestion.groupBy({ by: ["statut"], _count: true }),
  ]);
  const ents = await prisma.entreprise.findMany({ where: { id: { in: [...new Set(l.flatMap((q) => q.entreprises))] } }, select: { id: true, nom: true } });
  return NextResponse.json({
    compteurs: Object.fromEntries(compteurs.map((c) => [c.statut, c._count])),
    sources: SOURCES_BUDDY.map((s) => ({ code: s.code, label: s.label })),
    questions: l.map((q) => ({ id: q.id, question: q.question, reponse: q.reponse, source: q.source, action: q.action, motsCles: q.motsCles, occurrences: q.occurrences, statut: q.statut, majLe: q.updatedAt, clients: q.entreprises.map((id) => ents.find((e) => e.id === id)?.nom).filter(Boolean) })),
  });
}

/** POST (portail) { action, email, … } : repondre { id, reponse, source } · ignorer { id } · rouvrir { id } · supprimer { id } · creer { question, reponse, source } */
export async function POST(request: NextRequest) {
  if (!appelDuPortail(request.headers.get("authorization"))) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const email = typeof b.email === "string" ? b.email : null;
  const id = /^[\w-]{1,60}$/.test(String(b.id ?? "")) ? String(b.id) : "";
  const appel = async (chemin: string, methode: string, corps?: unknown) => { const r = await appelInterne(request, email, chemin, { methode, corps }); const d = await r.json().catch(() => ({})); return NextResponse.json(r.ok ? { succes: true } : { erreur: d?.erreur ?? `Refusé (${r.status})` }, { status: r.ok ? 200 : r.status }); };
  switch (b.action) {
    case "repondre": return appel(`/api/buddy/questions/${id}`, "PUT", { reponse: typeof b.reponse === "string" ? b.reponse : "", source: b.source || null, statut: "REPONDUE" });
    case "ignorer": return appel(`/api/buddy/questions/${id}`, "PUT", { statut: "IGNOREE" });
    case "rouvrir": return appel(`/api/buddy/questions/${id}`, "PUT", { statut: "A_TRAITER" });
    case "supprimer": return appel(`/api/buddy/questions/${id}`, "DELETE");
    case "creer": return appel("/api/buddy/questions", "POST", { question: b.question, reponse: b.reponse, source: b.source || null });
  }
  return NextResponse.json({ erreur: "Action inconnue" }, { status: 400 });
}
