import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getSessionSalarie } from "@/lib/session";
import { aAccesPaie } from "@/lib/droits";
import { salarieVisible } from "@/lib/perimetre";
import { lireFichierStocke, supprimerFichierStocke } from "@/lib/stockage";
import { telecharger } from "@/lib/fichiers";

type Ctx = { params: Promise<{ id: string }> };

/** GET : le PDF du bulletin (salarié concerné, employeur avec l'onglet Paie, ou admin) */
export async function GET(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const b = await prisma.bulletin.findUnique({ where: { id }, include: { salarie: { select: { etablissement: true } } } });
  if (!b) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  const session = await getSession();
  let autorise = session?.role === "ADMIN" || (session?.role === "CLIENT" && session.entrepriseId === b.entrepriseId && aAccesPaie(session.entreprise) && salarieVisible(session, b.salarie));
  let parSalarie = false;
  if (!autorise) {
    const s = await getSessionSalarie();
    if (s.ok && s.salarie.id === b.salarieId) { autorise = true; parSalarie = true; }
  }
  if (!autorise) return NextResponse.json({ erreur: "Non autorisé" }, { status: 403 });
  const contenu = await lireFichierStocke({ cle: b.cle, contenu: b.contenu });
  if (!contenu) return NextResponse.json({ erreur: "Fichier introuvable" }, { status: 404 });
  if (parSalarie && !b.vuLe) await prisma.bulletin.update({ where: { id }, data: { vuLe: new Date() } });
  return telecharger(contenu, b.nom, "application/pdf", true);
}

/** DELETE (admin) */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const b = await prisma.bulletin.findUnique({ where: { id }, select: { cle: true } });
  if (!b) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  await prisma.bulletin.delete({ where: { id } });
  await supprimerFichierStocke(b.cle).catch(() => {});
  return NextResponse.json({ succes: true });
}
