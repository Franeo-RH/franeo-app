import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { envoyerMailTexte } from "@/lib/notifications";
import { journaliser } from "@/lib/securite";

/** POST (admin) { entrepriseId, a: string[], sujet, corps } : e-mail rédigé à un client (comptes ou adresse de l'entreprise) */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const e = typeof b.entrepriseId === "string" ? await prisma.entreprise.findUnique({ where: { id: b.entrepriseId }, select: { id: true, email: true, demo: true, utilisateurs: { where: { role: "CLIENT" }, select: { email: true } } } }) : null;
  if (!e) return NextResponse.json({ erreur: "Entreprise introuvable" }, { status: 404 });
  if (e.demo) return NextResponse.json({ erreur: "Indisponible pour la démo." }, { status: 400 });
  const autorises = new Set([...(e.email ? [e.email.toLowerCase()] : []), ...e.utilisateurs.map((u) => u.email.toLowerCase())]);
  const a = (Array.isArray(b.a) ? b.a : []).map((x: unknown) => String(x).toLowerCase()).filter((x: string) => autorises.has(x));
  const sujet = typeof b.sujet === "string" ? b.sujet.trim().slice(0, 200) : "";
  const corps = typeof b.corps === "string" ? b.corps.trim().slice(0, 8000) : "";
  if (!a.length || !sujet || !corps) return NextResponse.json({ erreur: "Destinataire, objet et message obligatoires." }, { status: 400 });
  let n = 0;
  for (const dest of a) if (await envoyerMailTexte({ a: dest, sujet, texte: corps, repondreA: process.env.EMAIL_REPONSE || null })) n++;
  if (!n) return NextResponse.json({ erreur: "L'e-mail n'a pas pu partir." }, { status: 502 });
  await journaliser({ action: "EMAIL", utilisateur: session, request, entrepriseId: e.id, cible: `E-mail « ${sujet} »`, details: a.join(", ") }).catch(() => {});
  return NextResponse.json({ succes: true, envoyes: n });
}
