import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const { entrepriseId, mois, annee } = await request.json();

  if (!entrepriseId || !mois || !annee) {
    return NextResponse.json({ erreur: "Champs obligatoires manquants" }, { status: 400 });
  }

  const entreprise = await prisma.entreprise.findUnique({
    where: { id: entrepriseId },
    include: {
      abonnement: true,
      abonnementPaie: true,
    },
  });

  if (!entreprise) {
    return NextResponse.json({ erreur: "Entreprise introuvable" }, { status: 404 });
  }

  if (!entreprise.actif) {
    return NextResponse.json({ erreur: "Entreprise suspendue : aucune facture à générer." }, { status: 400 });
  }

  if (entreprise.demo) {
    return NextResponse.json({ erreur: "L'entreprise de démonstration n'est pas facturée." }, { status: 400 });
  }

  const abonnement = entreprise.abonnement;
  const abonnementPaie = entreprise.abonnementPaie;

  if (!abonnement && !abonnementPaie) {
    return NextResponse.json({ erreur: "Aucun abonnement (RH ou paie) pour cette entreprise" }, { status: 404 });
  }

  const moisInt = parseInt(mois);
  const anneeInt = parseInt(annee);
  const debutMois = new Date(anneeInt, moisInt - 1, 1);
  const finMois = new Date(anneeInt, moisInt, 0);

  // Salariés actifs sur le mois facturé (sert pour le RH et pour les bulletins paie)
  const nbSalariesMois = await prisma.salarie.count({
    where: {
      entrepriseId,
      statut: "Actif",
      dateDebut: { lte: finMois },
      OR: [{ dateFin: null }, { dateFin: { gte: debutMois } }],
    },
  });

  let montant = 0;
  const details: string[] = [];

  // ── Abonnement RH ──
  if (abonnement) {
    montant += abonnement.prixMensuel;
    details.push(`${abonnement.nom} : ${abonnement.prixMensuel} €`);

    const salariesSupp = Math.max(nbSalariesMois - abonnement.salariesInclus, 0);
    if (salariesSupp > 0 && abonnement.prixSalarieSupp > 0) {
      const cout = salariesSupp * abonnement.prixSalarieSupp;
      montant += cout;
      details.push(
        `${nbSalariesMois} salariés dont ${salariesSupp} supp. (${abonnement.prixSalarieSupp} €) : ${cout} €`
      );
    }

    const ticketsSupp = Math.max(entreprise.ticketsUtilises - abonnement.ticketsRH, 0);
    if (ticketsSupp > 0 && abonnement.prixTicketSupp > 0) {
      const cout = ticketsSupp * abonnement.prixTicketSupp;
      montant += cout;
      details.push(`${ticketsSupp} ticket(s) supp. : ${cout} €`);
    }
  }

  // ── Abonnement Paie ──
  if (abonnementPaie) {
    montant += abonnementPaie.prixMensuel;
    details.push(`Paie ${abonnementPaie.nom} : ${abonnementPaie.prixMensuel} €`);

    const bulletinsSupp = Math.max(nbSalariesMois - abonnementPaie.bulletinsInclus, 0);
    if (bulletinsSupp > 0 && abonnementPaie.prixBulletinSupp > 0) {
      const cout = bulletinsSupp * abonnementPaie.prixBulletinSupp;
      montant += cout;
      details.push(
        `${nbSalariesMois} bulletins dont ${bulletinsSupp} supp. (${abonnementPaie.prixBulletinSupp} €) : ${cout} €`
      );
    }
  }

  const dateLimitePaie = new Date(anneeInt, moisInt, 0);

  // Vérifier si une facturation existe déjà (ex: recrutement)
  const existante = await prisma.facturation.findFirst({
    where: { entrepriseId, mois: moisInt, annee: anneeInt },
  });

  if (existante) {
    const deja = existante.commentaire || "";
    const dejaGenere =
      (abonnement && deja.includes(`${abonnement.nom} : ${abonnement.prixMensuel} €`)) ||
      (abonnementPaie && deja.includes(`Paie ${abonnementPaie.nom} : ${abonnementPaie.prixMensuel} €`));
    if (dejaGenere) {
      return NextResponse.json(
        { erreur: "Ce mois a déjà été généré pour cette entreprise. Utilisez « Supprimer la génération du mois » pour le refaire." },
        { status: 400 }
      );
    }

    const nouveauMontant = Math.round((existante.montant + montant) * 100) / 100;
    const ancien = (existante.commentaire || "").replace(/ \| /g, "\n");
    const nouveauCommentaire = details.join("\n") + (ancien ? `\n${ancien}` : "");

    const facturation = await prisma.facturation.update({
      where: { id: existante.id },
      data: {
        montant: nouveauMontant,
        dateLimitePaie,
        commentaire: nouveauCommentaire,
      },
    });

    return NextResponse.json({
      succes: true,
      facturation,
      details,
      montant: nouveauMontant,
    });
  }

  const facturation = await prisma.facturation.create({
    data: {
      entrepriseId,
      mois: moisInt,
      annee: anneeInt,
      montant: Math.round(montant * 100) / 100,
      dateLimitePaie,
      commentaire: details.join("\n"),
    },
  });

  return NextResponse.json({
    succes: true,
    facturation,
    details,
    montant: Math.round(montant * 100) / 100,
  });
}