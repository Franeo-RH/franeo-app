import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { filtreSalaries } from "@/lib/perimetre";
import { TYPES_ENTRETIEN } from "@/lib/entretiens";

/** GET (client) : salariés en poste avec leurs entretiens */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const maintenant = new Date();
  const salaries = await prisma.salarie.findMany({
    where: { ...filtreSalaries(session), entrepriseId: session.entrepriseId, statut: "Actif", OR: [{ dateFin: null }, { dateFin: { gte: maintenant } }] },
    select: { id: true, prenom: true, nom: true, poste: true, dateDebut: true, entretiens: { select: { id: true, type: true, date: true, statut: true, responsable: true }, orderBy: { date: "desc" } } },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });
  return NextResponse.json(salaries);
}

/** POST (client) { salarieId, type, date, responsable } : planifier un entretien */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (!aDroit(session.entreprise?.permissions, "salaries.modifier")) return NextResponse.json({ erreur: "Action non autorisée pour votre compte." }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  if (!TYPES_ENTRETIEN[b.type] || !/^\d{4}-\d{2}-\d{2}$/.test(String(b.date))) return NextResponse.json({ erreur: "Type et date obligatoires" }, { status: 400 });
  const s = await prisma.salarie.findFirst({ where: { id: String(b.salarieId || ""), entrepriseId: session.entrepriseId, ...filtreSalaries(session) }, select: { id: true } });
  if (!s) return NextResponse.json({ erreur: "Salarié introuvable" }, { status: 404 });
  const e = await prisma.entretien.create({
    data: { salarieId: s.id, entrepriseId: session.entrepriseId, type: b.type, date: new Date(`${b.date}T12:00:00`), responsable: typeof b.responsable === "string" ? b.responsable.trim().slice(0, 100) || null : null },
    select: { id: true },
  });
  return NextResponse.json({ succes: true, id: e.id });
}
