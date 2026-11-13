import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { estimerAvantages, joursOuvresMois, lireAvantagesEntreprise, lireAvantagesSalarie } from "@/lib/avantages";

type Ctx = { params: Promise<{ id: string }> };

async function charger(id: string, ecriture: boolean) {
  const session = await getSession();
  if (!session) return { refus: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  const s = await prisma.salarie.findUnique({ where: { id }, select: { id: true, entrepriseId: true, avantagesMensuels: true, entreprise: { select: { avantages: true } } } });
  if (!s || (session.role === "CLIENT" && s.entrepriseId !== session.entrepriseId) || (session.role !== "CLIENT" && session.role !== "ADMIN")) {
    return { refus: NextResponse.json({ erreur: "Salarié introuvable" }, { status: 404 }) };
  }
  if (session.role === "CLIENT") {
    const p = session.entreprise?.permissions;
    if (!aDroit(p, "salaries.salaires")) return { refus: NextResponse.json({ erreur: "Vous ne voyez pas les données de rémunération." }, { status: 403 }) };
    if (ecriture && !aDroit(p, "salaries.modifier")) return { refus: NextResponse.json({ erreur: "Action non autorisée pour votre compte." }, { status: 403 }) };
  }
  return { s };
}

function reponse(entrepriseJson: unknown, salarieJson: unknown) {
  const e = lireAvantagesEntreprise(entrepriseJson);
  const sal = lireAvantagesSalarie(salarieJson, e);
  const d = new Date();
  const jours = sal.joursMois ?? joursOuvresMois(d.getMonth() + 1, d.getFullYear());
  return { entreprise: e, salarie: sal, estimation: estimerAvantages(e, sal, jours) };
}

/** GET : avantages proposés par l'entreprise, choix du salarié et estimation du mois en cours */
export async function GET(_r: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const c = await charger(id, false);
  if (!c.s) return c.refus!;
  return NextResponse.json(reponse(c.s.entreprise.avantages, c.s.avantagesMensuels));
}

/** PUT { tr, panier, joursMois, autres: [{ libelle, montant }] } */
export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const c = await charger(id, true);
  if (!c.s) return c.refus!;
  const b = await request.json().catch(() => ({}));
  const e = lireAvantagesEntreprise(c.s.entreprise.avantages);
  const sal = lireAvantagesSalarie(b, e);
  if (sal.joursMois != null && (sal.joursMois < 0 || sal.joursMois > 31)) return NextResponse.json({ erreur: "Jours par mois : entre 0 et 31." }, { status: 400 });
  // On garde les choix « non » explicites même si l'entreprise ne verse pas encore l'avantage
  const stocke = { tr: b.tr !== false, panier: b.panier !== false, joursMois: sal.joursMois, autres: sal.autres };
  await prisma.salarie.update({ where: { id }, data: { avantagesMensuels: stocke } });
  return NextResponse.json({ succes: true, ...reponse(c.s.entreprise.avantages, stocke) });
}
