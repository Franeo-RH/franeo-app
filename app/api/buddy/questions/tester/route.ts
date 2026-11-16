import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { motsClesDe, reponseApprise } from "@/lib/buddy/apprentissage";
import { libelleSource } from "@/lib/buddy/sources-liste";

/** POST (admin) { question } : montre la réponse paramétrée que Buddy donnerait à cette question */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const question = String(b.question || "").trim().slice(0, 500);
  if (!question) return NextResponse.json({ erreur: "Tapez une question." }, { status: 400 });
  const r = await reponseApprise(question);
  return NextResponse.json({ reponse: r?.reponse ?? null, source: libelleSource(r?.source), trouve: !!r, motsCles: motsClesDe(question) });
}
