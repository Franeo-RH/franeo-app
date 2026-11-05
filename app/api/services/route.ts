import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";

/** POST { nom } : nouveau service (onglet Services) */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (session.role === "CLIENT" && !aDroit(session.entreprise?.permissions, "rh.services")) return NextResponse.json({ erreur: "Action non autorisée pour votre compte." }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const entrepriseId = session.role === "ADMIN" ? String(b.entrepriseId ?? "") : session.entrepriseId!;
  const nom = typeof b.nom === "string" ? b.nom.trim().slice(0, 80) : "";
  if (!nom) return NextResponse.json({ erreur: "Nom du service obligatoire" }, { status: 400 });
  const existe = await prisma.service.findUnique({ where: { entrepriseId_nom: { entrepriseId, nom } } });
  if (existe) return NextResponse.json({ erreur: "Ce service existe déjà." }, { status: 409 });
  const n = await prisma.service.count({ where: { entrepriseId } });
  const s = await prisma.service.create({ data: { entrepriseId, nom, ordre: n } });
  return NextResponse.json({ succes: true, service: s });
}
