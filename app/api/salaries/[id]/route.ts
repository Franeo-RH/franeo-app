import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { matriculeDejaPris, nettoyerMatricule } from "@/lib/matricule";
import { estSessionDemo } from "@/lib/demo";
import { aDroit, passeParValidation } from "@/lib/droits";
import { creerDemande } from "@/lib/demandes-salaries";

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
  let demandeEnvoyee = false;

  if (!salarie) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });

  if (session.role === "CLIENT" && salarie.entrepriseId !== session.entrepriseId) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  if (session.role === "CLIENT" && !estSessionDemo(session)) {
    if (!aDroit(session.entreprise?.permissions, "salaries.modifier")) {
      return NextResponse.json({ erreur: "Vous n'avez pas le droit de modifier les salariés. Contactez votre gestionnaire." }, { status: 403 });
    }
    // Client « paie » : seuls le POSTE et le SALAIRE passent par une demande validée par le gestionnaire.
    // Tout le reste de la fiche est enregistré tout de suite.
    if (passeParValidation(session.entreprise)) {
      const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : parseFloat(String(v)));
      const sensibles: Record<string, unknown> = {};
      if (data.poste !== undefined && String(data.poste ?? "").trim() !== (salarie.poste ?? "")) sensibles.poste = String(data.poste ?? "").trim();
      if (data.salaireMensuel !== undefined && num(data.salaireMensuel) !== salarie.salaireMensuel) sensibles.salaireMensuel = num(data.salaireMensuel);
      if (data.salaireAnnuel !== undefined && num(data.salaireAnnuel) !== salarie.salaireAnnuel) sensibles.salaireAnnuel = num(data.salaireAnnuel);

      if (Object.keys(sensibles).length > 0) {
        await creerDemande({ entrepriseId: salarie.entrepriseId, type: "MODIFICATION", salarieId: id, donnees: { partiel: true, ...sensibles }, auteur: `${session.prenom} (${session.email})` });
        demandeEnvoyee = true;
      }
      // Le reste est appliqué directement, avec le poste et le salaire actuels
      data.poste = salarie.poste;
      data.salaireMensuel = salarie.salaireMensuel;
      data.salaireAnnuel = salarie.salaireAnnuel;
    }
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
        etablissement: data.etablissement || null,
        service: data.service || null,
        ...(data.soldeConges !== undefined ? { soldeConges: data.soldeConges === "" || data.soldeConges === undefined || data.soldeConges === null ? null : parseFloat(String(data.soldeConges).replace(",", ".")) } : {}),
        conventionCollective: data.conventionCollective || null,
        categorie: data.categorie || null,
        coefficient: data.coefficient || null,
        salaireMensuel: data.salaireMensuel ? parseFloat(data.salaireMensuel) : null,
        salaireAnnuel: data.salaireAnnuel ? parseFloat(data.salaireAnnuel) : null,
        primes: data.primes ? parseFloat(data.primes) : null,
        avantages: data.avantages || null,
      },
    });

    if (demandeEnvoyee) {
      return NextResponse.json(
        { succes: true, updated, demande: true, message: "Modifications enregistrées. Le changement de poste ou de salaire a été envoyé à votre gestionnaire pour validation." },
        { status: 202 }
      );
    }
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

  if (session.role === "CLIENT" && !estSessionDemo(session)) {
    if (!aDroit(session.entreprise?.permissions, "salaries.supprimer")) {
      return NextResponse.json({ erreur: "Vous n'avez pas le droit de supprimer des salariés. Contactez votre gestionnaire." }, { status: 403 });
    }
    if (passeParValidation(session.entreprise)) {
      await creerDemande({ entrepriseId: salarie.entrepriseId, type: "SUPPRESSION", salarieId: id, auteur: `${session.prenom} (${session.email})` });
      return NextResponse.json(
        { demande: true, message: "Votre demande de suppression a été envoyée à votre gestionnaire." },
        { status: 202 }
      );
    }
  }

  await prisma.salarie.delete({ where: { id } });

  return NextResponse.json({ succes: true });
}