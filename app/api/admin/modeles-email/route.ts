import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { MODELES_EMAIL_DEFAUT } from "@/lib/modeles-email";

async function admin() { const s = await getSession(); return s?.role === "ADMIN" ? s : null; }
const txt = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** GET (admin) : les modèles (créés avec les modèles de départ la première fois) */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if ((await prisma.modeleEmail.count()) === 0) {
    await prisma.modeleEmail.createMany({ data: MODELES_EMAIL_DEFAUT.map((m, i) => ({ ...m, ordre: i })) });
  }
  return NextResponse.json(await prisma.modeleEmail.findMany({ orderBy: [{ ordre: "asc" }, { nom: "asc" }] }));
}

/** POST (admin) { nom, sujet, corps } */
export async function POST(request: NextRequest) {
  if (!(await admin())) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const nom = txt(b.nom, 100), sujet = txt(b.sujet, 200), corps = txt(b.corps, 8000);
  if (!nom || !sujet || !corps) return NextResponse.json({ erreur: "Nom, objet et message obligatoires." }, { status: 400 });
  const m = await prisma.modeleEmail.create({ data: { nom, sujet, corps, ordre: 99 } });
  return NextResponse.json({ succes: true, id: m.id });
}
