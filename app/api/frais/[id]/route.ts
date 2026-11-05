import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { deciderFrais } from "@/lib/decisions";

async function charger(id: string) {
  const session = await getSession();
  if (!session) return { session: null, f: null };
  const f = await prisma.noteFrais.findUnique({ where: { id } });
  if (!f || (session.role === "CLIENT" && (f.entrepriseId !== session.entrepriseId || !aDroit(session.entreprise?.permissions, "rh.frais")))) return { session, f: null };
  return { session, f };
}

/** PUT { statut: "Validé" | "Refusé", motif? } */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, f } = await charger(id);
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (!f) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  const { statut, motif } = await request.json().catch(() => ({}));
  if (statut !== "Validé" && statut !== "Refusé") return NextResponse.json({ erreur: "Statut invalide" }, { status: 400 });
  const res = await deciderFrais(id, statut, motif, session.role === "ADMIN" ? "FRANEO RH" : session.prenom);
  return res.ok ? NextResponse.json({ succes: true }) : NextResponse.json({ erreur: res.erreur }, { status: res.status });
}

/** DELETE : impossible une fois la note validée */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, f } = await charger(id);
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (!f) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  if (f.statut === "Validé" && session.role !== "ADMIN") return NextResponse.json({ erreur: "Note validée : elle est déjà dans les variables de paie." }, { status: 400 });
  await prisma.noteFrais.delete({ where: { id } });
  return NextResponse.json({ succes: true });
}
