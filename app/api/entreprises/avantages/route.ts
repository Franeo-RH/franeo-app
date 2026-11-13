import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { lireAvantagesEntreprise } from "@/lib/avantages";

/** Entreprise visée : la sienne pour un client, ?entrepriseId= pour l'admin */
async function cible(request: NextRequest, ecriture: boolean) {
  const session = await getSession();
  if (!session) return { refus: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  if (session.role === "ADMIN") {
    const id = request.nextUrl.searchParams.get("entrepriseId");
    if (!id) return { refus: NextResponse.json({ erreur: "Entreprise manquante" }, { status: 400 }) };
    return { id };
  }
  if (session.role !== "CLIENT" || !session.entrepriseId) return { refus: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }) };
  if (ecriture && !aDroit(session.entreprise?.permissions, "entreprise.modifier")) return { refus: NextResponse.json({ erreur: "Action non autorisée pour votre compte." }, { status: 403 }) };
  return { id: session.entrepriseId };
}

/** GET : avantages versés par l'entreprise */
export async function GET(request: NextRequest) {
  const c = await cible(request, false);
  if (!c.id) return c.refus!;
  const e = await prisma.entreprise.findUnique({ where: { id: c.id }, select: { avantages: true } });
  if (!e) return NextResponse.json({ erreur: "Entreprise introuvable" }, { status: 404 });
  return NextResponse.json({ avantages: lireAvantagesEntreprise(e.avantages) });
}

/** PUT { tr, panier, autres } */
export async function PUT(request: NextRequest) {
  const c = await cible(request, true);
  if (!c.id) return c.refus!;
  const a = lireAvantagesEntreprise(await request.json().catch(() => ({})));
  if (a.tr.actif && (!a.tr.valeur || a.tr.valeur <= 0)) return NextResponse.json({ erreur: "Indiquez la valeur d'un ticket restaurant." }, { status: 400 });
  if (a.tr.actif && (a.tr.partPatronale == null || a.tr.partPatronale < 0 || a.tr.partPatronale > 100)) return NextResponse.json({ erreur: "La part patronale doit être entre 0 et 100 %." }, { status: 400 });
  if (a.panier.actif && (!a.panier.montant || a.panier.montant <= 0)) return NextResponse.json({ erreur: "Indiquez le montant du panier repas." }, { status: 400 });
  await prisma.entreprise.update({ where: { id: c.id }, data: { avantages: a } });
  return NextResponse.json({ succes: true, avantages: a });
}
