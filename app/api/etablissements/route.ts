import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";

function lire(b: Record<string, unknown>) {
  const t = (v: unknown, n = 120) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);
  return { nom: t(b.nom) ?? "", rue: t(b.rue, 200), codePostal: t(b.codePostal, 10), ville: t(b.ville), siret: t(b.siret, 20) };
}

/** GET : établissements ; POST { nom, rue, codePostal, ville, siret? } : ajout gratuit */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const entrepriseId = session.role === "ADMIN" ? request.nextUrl.searchParams.get("entrepriseId") || "" : session.entrepriseId || "";
  return NextResponse.json(await prisma.etablissement.findMany({ where: { entrepriseId }, orderBy: { createdAt: "asc" } }));
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (session.role === "CLIENT" && !aDroit(session.entreprise?.permissions, "entreprise.modifier")) return NextResponse.json({ erreur: "Action non autorisée pour votre compte." }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const entrepriseId = session.role === "ADMIN" ? String(b.entrepriseId ?? "") : session.entrepriseId!;
  const d = lire(b);
  if (!d.nom || !d.rue || !d.codePostal || !d.ville) return NextResponse.json({ erreur: "Nom et adresse complète (rue, code postal, ville) obligatoires." }, { status: 400 });
  const e = await prisma.etablissement.create({ data: { entrepriseId, ...d } });
  return NextResponse.json({ succes: true, etablissement: e });
}
