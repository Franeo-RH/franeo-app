// PUT : compléter / modifier un accident (déclaration, DAT, questionnaire CPAM, décision, clôture)
// DELETE : supprimer le dossier

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accesAccidents, avecStatut, champsDeclaration, champsEmployeur } from "@/lib/accidents-serveur";
import { supprimerFichiersDe } from "@/lib/pieces-jointes";

type Ctx = { params: Promise<{ id: string }> };

async function charger(id: string) {
  const a = await accesAccidents();
  if (!a.ok) return { ok: false as const, refus: a.refus };
  const at = await prisma.accidentTravail.findUnique({ where: { id }, include: { salarie: { select: { etablissement: true } } } });
  if (!at || (!a.admin && (at.entrepriseId !== a.session.entrepriseId || !a.visible(at.salarie)))) {
    return { ok: false as const, refus: NextResponse.json({ erreur: "Introuvable" }, { status: 404 }) };
  }
  return { ok: true as const, a, at };
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const c = await charger(id);
  if (!c.ok) return c.refus;
  const b = await request.json().catch(() => ({}));
  const maj = { ...champsDeclaration(b), ...champsEmployeur(b) };
  const clore = b.clore === true ? true : b.clore === false ? false : null;
  await prisma.accidentTravail.update({ where: { id }, data: avecStatut(c.at, maj, clore) as object });
  return NextResponse.json({ succes: true });
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const c = await charger(id);
  if (!c.ok) return c.refus;
  await supprimerFichiersDe({ accidentId: id });
  await prisma.accidentTravail.delete({ where: { id } });
  return NextResponse.json({ succes: true });
}
