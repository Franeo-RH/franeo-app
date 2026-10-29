import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * PUT (admin) { action: "valider" | "refuser" | "rouvrir", packId?, formulePaieId? }
 * « valider » crée l'entreprise et le compte client, et renvoie un lien pour choisir le mot de passe (à transmettre).
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const b = await request.json().catch(() => ({}));
  const d = await prisma.demandeInscription.findUnique({ where: { id } });
  if (!d) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });

  if (b.action === "refuser" || b.action === "rouvrir") {
    await prisma.demandeInscription.update({ where: { id }, data: { statut: b.action === "refuser" ? "REFUSEE" : "NOUVELLE", traiteeAt: b.action === "refuser" ? new Date() : null } });
    return NextResponse.json({ succes: true });
  }
  if (b.action !== "valider") return NextResponse.json({ erreur: "Action inconnue" }, { status: 400 });
  if (d.statut === "VALIDEE") return NextResponse.json({ erreur: "Demande déjà validée." }, { status: 400 });
  if (await prisma.utilisateur.findUnique({ where: { email: d.email } })) {
    return NextResponse.json({ erreur: `Un compte existe déjà avec l'email ${d.email}.` }, { status: 409 });
  }

  const entreprise = await prisma.entreprise.create({
    data: {
      nom: d.societe,
      email: d.email,
      telephone: d.telephone,
      abonnementId: b.packId || null,
      abonnementPaieId: b.formulePaieId || null,
    },
  });
  await prisma.utilisateur.create({
    data: { email: d.email, prenom: d.prenom, role: "CLIENT", entrepriseId: entreprise.id, motDePasse: await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10) },
  });
  await prisma.tokenReset.deleteMany({ where: { email: d.email } });
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.tokenReset.create({ data: { token, email: d.email, expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000) } });
  await prisma.demandeInscription.update({ where: { id }, data: { statut: "VALIDEE", traiteeAt: new Date(), entrepriseId: entreprise.id } });

  const base = (process.env.NEXT_PUBLIC_URL || process.env.APP_URL || request.nextUrl.origin).replace(/\/$/, "");
  return NextResponse.json({ succes: true, entrepriseId: entreprise.id, lien: `${base}/reinitialiser-mot-de-passe?token=${token}` });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  await prisma.demandeInscription.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ succes: true });
}
