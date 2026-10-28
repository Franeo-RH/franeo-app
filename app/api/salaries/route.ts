import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { matriculeDejaPris, nettoyerMatricule } from "@/lib/matricule";
import { lireRappel } from "@/lib/rappels";
import { estSessionDemo, LIMITE_SALARIES_DEMO, NOM_FAMILLE_DEMO } from "@/lib/demo";
import { evaluerSurcout, STATUT_ACCORD_REQUIS } from "@/lib/surcout";
import { aDroit, ajoutParValidation } from "@/lib/droits";
import { creerDemande } from "@/lib/demandes-salaries";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { erreur: "Non autorisé" },
      { status: 401 }
    );
  }

  const salaries =
    session.role === "ADMIN"
      ? await prisma.salarie.findMany({
          where: { entreprise: { demo: false } },
          include: { entreprise: true },
          orderBy: { createdAt: "desc" },
        })
      : await prisma.salarie.findMany({
          where: { entrepriseId: session.entrepriseId! },
          orderBy: { createdAt: "desc" },
        });

  return NextResponse.json(salaries);
}


export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { erreur: "Non autorisé" },
      { status: 401 }
    );
  }

  const brut = await request.json();

  const demo = estSessionDemo(session);

  if (session.role === "CLIENT" && !demo && !aDroit(session.entreprise?.permissions, "salaries.creer")) {
    return NextResponse.json({ erreur: "Vous n'avez pas le droit d'ajouter des salariés. Contactez votre gestionnaire." }, { status: 403 });
  }

  const data = demo
    ? {
        prenom: brut.prenom,
        nom: NOM_FAMILLE_DEMO,
        poste: brut.poste,
        dateDebut: brut.dateDebut,
        dateFin: brut.dateFin,
        salaireMensuel: brut.salaireMensuel,
        salaireAnnuel: brut.salaireAnnuel,
        rappels: brut.rappels,
      }
    : brut;


  if (!data.nom || !data.prenom || !data.poste) {
    return NextResponse.json(
      {
        erreur: demo
          ? "Prénom et poste sont obligatoires"
          : "Nom, prénom et poste sont obligatoires",
      },
      { status: 400 }
    );
  }


  const entrepriseId =
    session.role === "ADMIN"
      ? data.entrepriseId
      : session.entrepriseId;


  if (!entrepriseId) {
    return NextResponse.json(
      { erreur: "Entreprise manquante" },
      { status: 400 }
    );
  }


  if (demo) {
    const nb = await prisma.salarie.count({
      where: { entrepriseId },
    });

    if (nb >= LIMITE_SALARIES_DEMO) {
      return NextResponse.json(
        {
          erreur: `La démo est limitée à ${LIMITE_SALARIES_DEMO} salariés.`,
        },
        { status: 403 }
      );
    }
  }


  const matricule = demo
    ? null
    : nettoyerMatricule(data.matricule);


  if (matricule) {
    const existant = await matriculeDejaPris(
      entrepriseId,
      matricule
    );

    if (existant) {
      return NextResponse.json(
        {
          erreur: `Le matricule « ${matricule} » est déjà attribué à ${existant.prenom} ${existant.nom}.`,
        },
        { status: 409 }
      );
    }
  }


  // Supplément (salarié / bulletin au-delà de la formule) : accord du client requis
  if (session.role === "CLIENT" && !demo && brut.accepteSurcout !== true) {
    const surcout = await evaluerSurcout(entrepriseId, { salaries: 1 });
    if (surcout) {
      return NextResponse.json({ surcoutRequis: true, surcout }, { status: STATUT_ACCORD_REQUIS });
    }
  }

  // Client : l'ajout devient une demande, validée par le gestionnaire
  if (session.role === "CLIENT" && ajoutParValidation(session.entreprise)) {
    await creerDemande({ entrepriseId, type: "AJOUT", donnees: brut, auteur: `${session.prenom} (${session.email})` });
    return NextResponse.json(
      { demande: true, message: "Votre demande d'ajout a été envoyée. Le salarié apparaîtra dès sa validation par votre gestionnaire." },
      { status: 202 }
    );
  }

  const rappels: {
    type: string;
    libelle: string | null;
    dateEcheance: Date;
    commentaire: string | null;
  }[] = [];


  if (Array.isArray(data.rappels)) {
    for (const brutRappel of data.rappels) {

      const lu = lireRappel(brutRappel);


      if (lu.erreur) {
        return NextResponse.json(
          { erreur: lu.erreur },
          { status: 400 }
        );
      }


      if (!lu.valeur || !lu.valeur.type) {
        return NextResponse.json(
          { erreur: "Le type du rappel est obligatoire." },
          { status: 400 }
        );
      }


      rappels.push(lu.valeur);
    }
  }


  try {

    const salarie = await prisma.salarie.create({

      data: {

        entrepriseId,

        matricule,

        nom: data.nom,
        prenom: data.prenom,

        email: data.email || null,
        telephone: data.telephone || null,

        dateNaissance: data.dateNaissance
          ? new Date(data.dateNaissance)
          : null,

        lieuNaissance: data.lieuNaissance || null,
        nationalite: data.nationalite || null,

        numeroSecuriteSociale:
          data.numeroSecuriteSociale || null,

        rue: data.rue || null,
        codePostal: data.codePostal || null,
        ville: data.ville || null,
        pays: data.pays || null,

        poste: data.poste,

        typeContrat:
          data.typeContrat || null,

        dateDebut: data.dateDebut
          ? new Date(data.dateDebut)
          : null,

        dateFin: data.dateFin
          ? new Date(data.dateFin)
          : null,


        heuresHebdomadaires:
          data.heuresHebdomadaires
            ? parseFloat(data.heuresHebdomadaires)
            : null,


        manager: data.manager || null,

        conventionCollective:
          data.conventionCollective || null,

        categorie:
          data.categorie || null,

        coefficient:
          data.coefficient || null,


        salaireMensuel:
          data.salaireMensuel
            ? parseFloat(data.salaireMensuel)
            : null,


        salaireAnnuel:
          data.salaireAnnuel
            ? parseFloat(data.salaireAnnuel)
            : null,


        primes:
          data.primes
            ? parseFloat(data.primes)
            : null,


        avantages:
          data.avantages || null,


        rappels:
          rappels.length > 0
            ? { create: rappels }
            : undefined,
      },
    });


    return NextResponse.json({
      succes: true,
      salarie,
    });


  } catch (e) {

    if ((e as { code?: string }).code === "P2002") {

      return NextResponse.json(
        {
          erreur:
            "Ce matricule est déjà utilisé dans l'entreprise.",
        },
        { status: 409 }
      );

    }

    throw e;
  }
}