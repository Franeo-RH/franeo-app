import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accesProjets } from "@/lib/projets-serveur";
import { emetteur } from "@/lib/documents-projets";

type Ctx = { params: Promise<{ id: string }> };

/** GET : facture complète pour l'impression (émetteur, client du devis accepté) */
export async function GET(_r: NextRequest, { params }: Ctx) {
  const a = await accesProjets("projets.couts");
  if (!a.ok) return a.refus;
  const { id } = await params;
  const f = await prisma.factureProjet.findFirst({ where: { id, entrepriseId: a.entrepriseId }, include: { projet: { select: { id: true, nom: true, client: true, code: true } } } });
  if (!f) return NextResponse.json({ erreur: "Facture introuvable" }, { status: 404 });
  const [em, devis] = await Promise.all([
    emetteur(a.entrepriseId),
    prisma.devisProjet.findFirst({ where: { projetId: f.projetId, statut: "ACCEPTE" }, orderBy: { supplementaire: "asc" }, select: { numero: true, client: true, clientAdresse: true, clientEmail: true } }),
  ]);
  return NextResponse.json({ facture: f, emetteur: em, client: { nom: devis?.client ?? f.projet.client, adresse: devis?.clientAdresse ?? null, email: devis?.clientEmail ?? null, devis: devis?.numero ?? null } });
}

/** PATCH { action: "payee" | "nonPayee" | "annuler" | "relance" } */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const a = await accesProjets("projets.couts");
  if (!a.ok) return a.refus;
  if (!a.peutGerer) return NextResponse.json({ erreur: "Action non autorisée" }, { status: 403 });
  const { id } = await params;
  const f = await prisma.factureProjet.findFirst({ where: { id, entrepriseId: a.entrepriseId } });
  if (!f) return NextResponse.json({ erreur: "Facture introuvable" }, { status: 404 });
  const { action } = await request.json().catch(() => ({}));
  const majJalon = (facturation: string) => (f.jalonId ? prisma.jalonProjet.updateMany({ where: { id: f.jalonId }, data: { facturation } }) : Promise.resolve(null));

  if (action === "payee") {
    await prisma.factureProjet.update({ where: { id }, data: { statut: "PAYEE", payeeLe: new Date() } });
    await majJalon("PAYE");
  } else if (action === "nonPayee") {
    await prisma.factureProjet.update({ where: { id }, data: { statut: "EMISE", payeeLe: null } });
    await majJalon("FACTURE");
  } else if (action === "annuler") {
    if (f.statut === "PAYEE") return NextResponse.json({ erreur: "Facture payée : faites plutôt un avoir." }, { status: 409 });
    await prisma.factureProjet.update({ where: { id }, data: { statut: "ANNULEE" } });
    await majJalon("A_FACTURER");
  } else if (action === "relance") {
    await prisma.factureProjet.update({ where: { id }, data: { relances: { increment: 1 }, derniereRelance: new Date() } });
  } else {
    return NextResponse.json({ erreur: "Action inconnue" }, { status: 400 });
  }
  return NextResponse.json({ succes: true });
}
