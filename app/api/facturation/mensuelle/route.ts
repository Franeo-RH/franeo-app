import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST() {
  // Sécurité : route réservée à l'administrateur (elle n'était pas protégée)
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }
  const maintenant = new Date();
  const moisSuivant = maintenant.getMonth() + 2 > 12 ? 1 : maintenant.getMonth() + 2;
  const anneeSuivante = maintenant.getMonth() + 2 > 12 ? maintenant.getFullYear() + 1 : maintenant.getFullYear();

  const entreprises = await prisma.entreprise.findMany({
    where: { abonnementId: { not: null }, demo: false },
    include: {
      abonnement: true,
      _count: { select: { salaries: { where: { statut: "Actif" } } } },
    },
  });

  const resultats = [];

  for (const entreprise of entreprises) {
    if (!entreprise.abonnement) continue;

    const existante = await prisma.facturation.findFirst({
      where: { entrepriseId: entreprise.id, mois: moisSuivant, annee: anneeSuivante },
    });
    if (existante) continue;

    const abonnement = entreprise.abonnement;
    let montant = abonnement.prixMensuel;
    const details: string[] = [`${abonnement.nom} : ${abonnement.prixMensuel} €`];

    const salariesSupp = Math.max(entreprise._count.salaries - abonnement.salariesInclus, 0);
    if (salariesSupp > 0 && abonnement.prixSalarieSupp > 0) {
      const cout = salariesSupp * abonnement.prixSalarieSupp;
      montant += cout;
      details.push(`${salariesSupp} salarié(s) supp. : ${cout} €`);
    }

    const ticketsSupp = Math.max(entreprise.ticketsUtilises - abonnement.ticketsRH, 0);
    if (ticketsSupp > 0 && abonnement.prixTicketSupp > 0) {
      const cout = ticketsSupp * abonnement.prixTicketSupp;
      montant += cout;
      details.push(`${ticketsSupp} ticket(s) supp. : ${cout} €`);
    }

    const facturation = await prisma.facturation.create({
      data: {
        entrepriseId: entreprise.id,
        mois: moisSuivant,
        annee: anneeSuivante,
        montant: Math.round(montant * 100) / 100,
        dateLimitePaie: new Date(anneeSuivante, moisSuivant, 0),
        commentaire: details.join(" | "),
      },
    });

    resultats.push({ entreprise: entreprise.nom, montant: facturation.montant });
  }

  return NextResponse.json({ succes: true, facturations: resultats });
}