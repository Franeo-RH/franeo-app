// app/api/rgpd/salarie/[id]/route.ts
// Droits RGPD d'un salarié, exercés par son employeur (client) ou par FRANEO RH (admin) :
// GET  : fichier Excel avec toutes ses données (droit d'accès / portabilité)
// POST : anonymisation d'un salarié sorti (droit à l'effacement, en gardant la paie 5 ans)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit, passeParValidation } from "@/lib/droits";
import { estSessionDemo } from "@/lib/demo";
import { anonymiserSalarie, estSorti, exporterDonneesSalarie } from "@/lib/rgpd";
import { reponseExcel } from "@/lib/excel-marque";
import { journaliser } from "@/lib/securite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

async function charger(id: string) {
  const session = await getSession();
  if (!session) return { ok: false as const, refus: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  const salarie = await prisma.salarie.findUnique({ where: { id }, select: { id: true, nom: true, prenom: true, entrepriseId: true, statut: true, dateFin: true, anonymiseLe: true } });
  if (!salarie || (session.role !== "ADMIN" && salarie.entrepriseId !== session.entrepriseId)) {
    return { ok: false as const, refus: NextResponse.json({ erreur: "Salarié introuvable" }, { status: 404 }) };
  }
  return { ok: true as const, session, salarie };
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const c = await charger(id);
  if (!c.ok) return c.refus;
  const { session, salarie } = c;
  if (session.role === "CLIENT" && !aDroit(session.entreprise?.permissions, "salaries.modifier")) {
    return NextResponse.json({ erreur: "Vous n'avez pas le droit d'exporter les données des salariés." }, { status: 403 });
  }
  const r = await exporterDonneesSalarie(id);
  if (!r) return NextResponse.json({ erreur: "Salarié introuvable" }, { status: 404 });
  await journaliser({ action: "RGPD_EXPORT", utilisateur: session, entrepriseId: salarie.entrepriseId, cible: `${salarie.prenom} ${salarie.nom}`, request });
  return reponseExcel(r.buffer, r.nom);
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const c = await charger(id);
  if (!c.ok) return c.refus;
  const { session, salarie } = c;
  if (estSessionDemo(session)) return NextResponse.json({ erreur: "Non disponible dans la démo." }, { status: 403 });
  if (session.role === "CLIENT") {
    if (!aDroit(session.entreprise?.permissions, "salaries.supprimer")) {
      return NextResponse.json({ erreur: "Vous n'avez pas le droit d'effacer des données de salariés." }, { status: 403 });
    }
    if (passeParValidation(session.entreprise)) {
      return NextResponse.json({ erreur: "Votre paie est gérée par FRANEO RH : faites la demande par ticket, nous anonymisons le salarié pour vous." }, { status: 403 });
    }
  }
  if (!estSorti(salarie)) return NextResponse.json({ erreur: "Seul un salarié sorti de l'entreprise peut être anonymisé." }, { status: 400 });
  const corps = await request.json().catch(() => ({}));
  if (corps?.confirmation !== "ANONYMISER") return NextResponse.json({ erreur: "Confirmation manquante." }, { status: 400 });

  const r = await anonymiserSalarie(id);
  if (!r.ok) return NextResponse.json({ erreur: r.erreur }, { status: 400 });
  await journaliser({ action: "RGPD_ANONYMISATION", utilisateur: session, entrepriseId: salarie.entrepriseId, cible: `${salarie.prenom} ${salarie.nom} (${id})`, request });
  return NextResponse.json({ succes: true });
}
