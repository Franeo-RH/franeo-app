import { NextRequest, NextResponse } from "next/server";
import { niveauRH, permissionsFormule } from "@/lib/droits";
import { prisma } from "@/lib/prisma";
import { envoyerActivation, motDePasseProvisoire } from "@/lib/invitation";
import { getSession } from "@/lib/session";

/**
 * PUT (admin) { action: "valider" | "refuser" | "rouvrir", packId?, formulePaieId? }
 * « valider » crée l'entreprise et le compte client, et envoie au client l'e-mail d'activation (le lien n'est renvoyé que si l'e-mail n'a pas pu partir).
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

  // L'app n'est pas accessible gratuitement : une formule RH ou paie est obligatoire
  if (!b.packId && !b.formulePaieId) return NextResponse.json({ erreur: "Choisissez une formule RH ou une formule paie : l'application n'est pas accessible sans abonnement." }, { status: 400 });
  const pack = b.packId ? await prisma.abonnement.findUnique({ where: { id: String(b.packId) }, select: { nom: true } }) : null;
  const niveau = niveauRH({ abonnement: pack });
  const acces = ["", "BASIC", "ESSENTIEL", "SERENITE", "PREMIUM"][niveau] || "BASIC";

  const entreprise = await prisma.entreprise.create({
    data: {
      permissions: permissionsFormule(acces, [], !!b.formulePaieId),
      nom: d.societe,
      email: d.email,
      telephone: d.telephone,
      abonnementId: b.packId || null,
      abonnementPaieId: b.formulePaieId || null,
    },
  });
  await prisma.utilisateur.create({
    data: { email: d.email, prenom: d.prenom, role: "CLIENT", entrepriseId: entreprise.id, motDePasse: await motDePasseProvisoire() },
  });
  await prisma.demandeInscription.update({ where: { id }, data: { statut: "VALIDEE", traiteeAt: new Date(), entrepriseId: entreprise.id } });

  const activation = await envoyerActivation(request, { email: d.email, prenom: d.prenom, entreprise: entreprise.nom, premierCompte: true });
  return NextResponse.json({ succes: true, entrepriseId: entreprise.id, email: d.email, ...activation });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  await prisma.demandeInscription.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ succes: true });
}
