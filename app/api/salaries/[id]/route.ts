import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { matriculeDejaPris, nettoyerMatricule } from "@/lib/matricule";
import { estSessionDemo } from "@/lib/demo";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  const salarie = await prisma.salarie.findUnique({
    where: { id },
  });

  if (!salarie) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });

  if (session.role === "CLIENT" && salarie.entrepriseId !== session.entrepriseId) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  return NextResponse.json(salarie);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const data = await request.json();

  const salarie = await prisma.salarie.findUnique({ where: { id } });

  if (!salarie) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });

  if (session.role === "CLIENT" && salarie.entrepriseId !== session.entrepriseId) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  // Démo : seuls prénom, poste et salaire sont modifiables
  if (estSessionDemo(session)) {
    const updatedDemo = await prisma.salarie.update({
      where: { id },
      data: {
        ...(data.prenom ? { prenom: data.prenom } : {}),
        ...(data.poste ? { poste: data.poste } : {}),
        dateDebut: data.dateDebut ? new Date(data.dateDebut) : null,
        dateFin: data.dateFin ? new Date(data.dateFin) : null,
        salaireMensuel: data.salaireMensuel ? parseFloat(data.salaireMensuel) : null,
        salaireAnnuel: data.salaireAnnuel ? parseFloat(data.salaireAnnuel) : null,
      },
    });
    return NextResponse.json({ succes: true, updated: updatedDemo });
  }

  // Matricule : on ne le touche que s'il est envoyé par le formulaire
  const modifierMatricule = data.matricule !== undefined;
  const matricule = nettoyerMatricule(data.matricule);
  if (modifierMatricule && matricule) {
    const existant = await matriculeDejaPris(salarie.entrepriseId, matricule, id);
    if (existant) {
      return NextResponse.json(
        { erreur: `Le matricule « ${matricule} » est déjà attribué à ${existant.prenom} ${existant.nom}.` },
        { status: 409 }
      );
    }
  }

  try {
    const updated = await prisma.salarie.update({
      where: { id },
      data: {
        ...(modifierMatricule ? { matricule } : {}),
        nom: data.nom,
        prenom: data.prenom,
        email: data.email || null,
        telephone: data.telephone || null,
        dateNaissance: data.dateNaissance ? new Date(data.dateNaissance) : null,
        lieuNaissance: data.lieuNaissance || null,
        nationalite: data.nationalite || null,
        numeroSecuriteSociale: data.numeroSecuriteSociale || null,
        rue: data.rue || null,
        codePostal: data.codePostal || null,
        ville: data.ville || null,
        pays: data.pays || null,
        poste: data.poste,
        typeContrat: data.typeContrat || null,
        dateDebut: data.dateDebut ? new Date(data.dateDebut) : null,
        dateFin: data.dateFin ? new Date(data.dateFin) : null,
        heuresHebdomadaires: data.heuresHebdomadaires ? parseFloat(data.heuresHebdomadaires) : null,
        manager: data.manager || null,
        conventionCollective: data.conventionCollective || null,
        categorie: data.categorie || null,
        coefficient: data.coefficient || null,
        salaireMensuel: data.salaireMensuel ? parseFloat(data.salaireMensuel) : null,
        salaireAnnuel: data.salaireAnnuel ? parseFloat(data.salaireAnnuel) : null,
        primes: data.primes ? parseFloat(data.primes) : null,
        avantages: data.avantages || null,
      },
    });

    return NextResponse.json({ succes: true, updated });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ erreur: "Ce matricule est déjà utilisé dans l'entreprise." }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  const salarie = await prisma.salarie.findUnique({ where: { id } });

  if (!salarie) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });

  if (session.role === "CLIENT" && salarie.entrepriseId !== session.entrepriseId) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  await prisma.salarie.delete({ where: { id } });

  return NextResponse.json({ succes: true });
}