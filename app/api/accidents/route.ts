// app/api/accidents/route.ts
// GET  : accidents du travail (client : les siens, selon son périmètre ; admin : tous, ?entrepriseId=)
// POST : l'employeur déclare un accident pour un salarié

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { estSessionDemo } from "@/lib/demo";
import { accesAccidents, avecStatut, champsDeclaration, champsEmployeur } from "@/lib/accidents-serveur";
import { SELECT_PJ } from "@/lib/pieces-jointes";
import { notifierAdmin } from "@/lib/notifications";
import { TYPES_AT } from "@/lib/accidents";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const a = await accesAccidents();
  if (!a.ok) return a.refus;
  const ent = request.nextUrl.searchParams.get("entrepriseId");
  const liste = await prisma.accidentTravail.findMany({
    where: a.admin ? (ent ? { entrepriseId: ent } : { entreprise: { demo: false } }) : a.filtre,
    include: {
      salarie: { select: { id: true, prenom: true, nom: true, poste: true, etablissement: true } },
      entreprise: { select: { nom: true } },
      piecesJointes: { select: SELECT_PJ, orderBy: { createdAt: "asc" } },
    },
    orderBy: { dateAccident: "desc" },
    take: 300,
  });
  return NextResponse.json(liste);
}

export async function POST(request: NextRequest) {
  const a = await accesAccidents();
  if (!a.ok) return a.refus;
  if (a.admin) return NextResponse.json({ erreur: "Déclaration faite par le client ou le salarié." }, { status: 403 });
  if (estSessionDemo(a.session)) return NextResponse.json({ erreur: "Non disponible dans la démo." }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const s = await prisma.salarie.findUnique({ where: { id: String(b.salarieId ?? "") }, select: { id: true, entrepriseId: true, etablissement: true, prenom: true, nom: true } });
  if (!s || s.entrepriseId !== a.session.entrepriseId || !a.visible(s)) return NextResponse.json({ erreur: "Salarié introuvable" }, { status: 404 });
  const decl = champsDeclaration(b);
  if (!(decl.dateAccident instanceof Date)) return NextResponse.json({ erreur: "La date de l'accident est obligatoire." }, { status: 400 });
  const emp = champsEmployeur(b);
  const at = await prisma.accidentTravail.create({
    data: {
      ...(avecStatut({ statut: "A_DECLARER", datDate: null, questionnaireRecuLe: null, decision: null }, { ...decl, ...emp }) as object),
      dateAccident: decl.dateAccident,
      entrepriseId: s.entrepriseId, salarieId: s.id, declarePar: "EMPLOYEUR", auteur: a.session.prenom,
      connuLe: (emp.connuLe as Date | undefined) ?? new Date(),
    } as Parameters<typeof prisma.accidentTravail.create>[0]["data"],
  });
  await notifierAdmin({
    sujet: `${TYPES_AT[at.type] ?? "Accident"} — ${s.prenom} ${s.nom}`,
    titre: "🩹 Accident du travail déclaré par le client",
    lignes: [`${s.prenom} ${s.nom}, le ${at.dateAccident.toLocaleDateString("fr-FR")}`],
    lien: "/admin/salaries/accidents",
    entrepriseId: s.entrepriseId,
  });
  return NextResponse.json({ succes: true, id: at.id });
}
