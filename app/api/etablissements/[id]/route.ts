import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { aDroit } from "@/lib/droits";
import { geocoder } from "@/lib/geocodage";
import { lireZone, rayonValide } from "@/lib/zone";

async function verifier(id: string) {
  const session = await getSession();
  if (!session) return { erreur: NextResponse.json({ erreur: "Non autorisé" }, { status: 401 }), e: null };
  if (session.role === "CLIENT" && !aDroit(session.entreprise?.permissions, "entreprise.modifier")) return { erreur: NextResponse.json({ erreur: "Action non autorisée pour votre compte." }, { status: 403 }), e: null };
  const e = await prisma.etablissement.findUnique({ where: { id } });
  if (!e || (session.role === "CLIENT" && e.entrepriseId !== session.entrepriseId)) return { erreur: NextResponse.json({ erreur: "Introuvable" }, { status: 404 }), e: null };
  return { erreur: null, e };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await verifier(id);
  if (v.erreur || !v.e) return v.erreur ?? NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  const b = await request.json().catch(() => ({}));
  const t = (x: unknown, n = 120) => (typeof x === "string" && x.trim() ? x.trim().slice(0, n) : null);
  const nom = t(b.nom), rue = t(b.rue, 200), codePostal = t(b.codePostal, 10), ville = t(b.ville);
  if (!nom || !rue || !codePostal || !ville) return NextResponse.json({ erreur: "Nom et adresse complète obligatoires." }, { status: 400 });
  const adresseChangee = rue !== v.e.rue || codePostal !== v.e.codePostal || ville !== v.e.ville;
  const zone = lireZone(b) ?? (adresseChangee || v.e.latitude == null ? await geocoder(`${rue} ${codePostal} ${ville}`) : null);
  await prisma.etablissement.update({ where: { id }, data: { nom, rue, codePostal, ville, siret: t(b.siret, 20), ...(zone ?? {}), rayon: rayonValide(b.rayon, v.e.rayon) } });
  // Les fiches salariés suivent le nouveau nom
  if (v.e.nom !== nom) await prisma.salarie.updateMany({ where: { entrepriseId: v.e.entrepriseId, etablissement: v.e.nom }, data: { etablissement: nom } });
  return NextResponse.json({ succes: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await verifier(id);
  if (v.erreur || !v.e) return v.erreur ?? NextResponse.json({ erreur: "Introuvable" }, { status: 404 });
  const n = await prisma.etablissement.count({ where: { entrepriseId: v.e.entrepriseId } });
  if (n <= 1) return NextResponse.json({ erreur: "Au moins un établissement est obligatoire." }, { status: 400 });
  await prisma.etablissement.delete({ where: { id } });
  return NextResponse.json({ succes: true });
}
