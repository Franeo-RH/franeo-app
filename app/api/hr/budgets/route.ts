import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { VIEW_HR_INDICATORS } from "@/lib/indicateurs-calculs";

// PUT { entrepriseId?, budgetPrimesAnnuel, budgetFormationAnnuel } : budgets annuels (admin, ou client avec les indicateurs RH)
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const admin = session.role === "ADMIN";
  if (!admin && !(session.entreprise?.permissions || []).includes(VIEW_HR_INDICATORS)) return NextResponse.json({ erreur: "Non autorisé" }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const id = admin ? String(b.entrepriseId || "") : session.entrepriseId!;
  if (!id) return NextResponse.json({ erreur: "Choisissez une société." }, { status: 400 });
  const lire = (v: unknown) => (v === "" || v === null || v === undefined ? null : Number(String(v).replace(",", ".")));
  const primes = lire(b.budgetPrimesAnnuel);
  const formation = lire(b.budgetFormationAnnuel);
  if ((primes !== null && !Number.isFinite(primes)) || (formation !== null && !Number.isFinite(formation))) return NextResponse.json({ erreur: "Montant invalide" }, { status: 400 });
  await prisma.entreprise.update({ where: { id }, data: { budgetPrimesAnnuel: primes, budgetFormationAnnuel: formation } });
  return NextResponse.json({ succes: true });
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const id = session.role === "ADMIN" ? request.nextUrl.searchParams.get("entrepriseId") || "" : session.entrepriseId!;
  const e = id ? await prisma.entreprise.findUnique({ where: { id }, select: { budgetPrimesAnnuel: true, budgetFormationAnnuel: true } }) : null;
  return NextResponse.json(e ?? { budgetPrimesAnnuel: null, budgetFormationAnnuel: null });
}
