import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { filtreSalaries } from "@/lib/perimetre";
import { ETAPES } from "@/lib/checklists";

const JOUR = 86400000;

/** GET (client) : salariés arrivés ou partants récemment, avec leur checklist */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const m = Date.now();
  const [arrivees, departs] = await Promise.all([
    prisma.salarie.findMany({
      where: { ...filtreSalaries(session), entrepriseId: session.entrepriseId, dateDebut: { gte: new Date(m - 90 * JOUR), lte: new Date(m + 45 * JOUR) } },
      select: { id: true, prenom: true, nom: true, poste: true, dateDebut: true, checklists: { where: { type: "ARRIVEE" }, select: { faits: true } } },
      orderBy: { dateDebut: "desc" },
    }),
    prisma.salarie.findMany({
      where: { ...filtreSalaries(session), entrepriseId: session.entrepriseId, dateFin: { gte: new Date(m - 90 * JOUR), lte: new Date(m + 60 * JOUR) } },
      select: { id: true, prenom: true, nom: true, poste: true, dateFin: true, checklists: { where: { type: "DEPART" }, select: { faits: true } } },
      orderBy: { dateFin: "asc" },
    }),
  ]);
  return NextResponse.json({
    arrivees: arrivees.map(({ checklists, ...s }) => ({ ...s, date: s.dateDebut, faits: checklists[0]?.faits ?? [] })),
    departs: departs.map(({ checklists, ...s }) => ({ ...s, date: s.dateFin, faits: checklists[0]?.faits ?? [] })),
  });
}

/** PUT (client) { salarieId, type, cle, fait } : coche ou décoche une étape */
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.entrepriseId) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  if (!aDroit(session.entreprise?.permissions, "salaries.modifier")) return NextResponse.json({ erreur: "Action non autorisée pour votre compte." }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const type = b.type === "DEPART" ? "DEPART" : b.type === "ARRIVEE" ? "ARRIVEE" : null;
  if (!type || !ETAPES[type].some((e) => e.cle === b.cle)) return NextResponse.json({ erreur: "Étape inconnue" }, { status: 400 });
  const s = await prisma.salarie.findFirst({ where: { id: String(b.salarieId || ""), entrepriseId: session.entrepriseId, ...filtreSalaries(session) }, select: { id: true } });
  if (!s) return NextResponse.json({ erreur: "Salarié introuvable" }, { status: 404 });
  const c = await prisma.checklistSalarie.findUnique({ where: { salarieId_type: { salarieId: s.id, type } } });
  const faits = new Set(c?.faits ?? []);
  if (b.fait) faits.add(b.cle); else faits.delete(b.cle);
  await prisma.checklistSalarie.upsert({
    where: { salarieId_type: { salarieId: s.id, type } },
    create: { salarieId: s.id, entrepriseId: session.entrepriseId, type, faits: [...faits] },
    update: { faits: [...faits] },
  });
  return NextResponse.json({ succes: true, faits: [...faits] });
}
