// lib/facturation.ts
// Calcul unique du montant mensuel d'un client : sert à la génération des factures,
// à l'aperçu, aux estimations des dashboards. Une seule règle, partout.

import { prisma } from "@/lib/prisma";

type FormuleRH = { nom: string; prixMensuel: number; salariesInclus: number; prixSalarieSupp: number; ticketsRH: number; prixTicketSupp: number } | null;
type FormulePaie = {
  nom: string; prixMensuel: number; bulletinsInclus: number; prixBulletinSupp: number;
  entreesSortiesIncluses: boolean; prixEntree: number; prixSortie: number;
  ticketsRHInclus: number; prixTicketSupp: number;
} | null;

/** Tickets RH inclus chaque mois (abonnement RH + formule paie) et prix d'un ticket supplémentaire */
export function quotaTickets(e: { abonnement: FormuleRH; abonnementPaie: FormulePaie }) {
  const inclus = (e.abonnement?.ticketsRH || 0) + (e.abonnementPaie?.ticketsRHInclus || 0);
  // Le prix de la formule paie prime (c'est elle qui fixe le prix des tickets supplémentaires)
  const prixSupp = e.abonnementPaie && e.abonnementPaie.prixTicketSupp > 0
    ? e.abonnementPaie.prixTicketSupp
    : e.abonnement?.prixTicketSupp || 0;
  return { inclus, prixSupp };
}

export function bornesMois(mois: number, annee: number) {
  return { debut: new Date(annee, mois - 1, 1), fin: new Date(annee, mois, 0, 23, 59, 59, 999) };
}

/** Tickets RH ouverts dans le mois (les tickets non utilisés sont perdus d'un mois sur l'autre) */
export async function ticketsDuMois(entrepriseId: string, mois: number, annee: number): Promise<number> {
  const { debut, fin } = bornesMois(mois, annee);
  return prisma.ticket.count({ where: { entrepriseId, createdAt: { gte: debut, lte: fin } } });
}

/** Le même compte pour plusieurs entreprises (une seule requête) */
export async function ticketsDuMoisParEntreprise(mois: number, annee: number, entrepriseIds?: string[]) {
  const { debut, fin } = bornesMois(mois, annee);
  const groupes = await prisma.ticket.groupBy({
    by: ["entrepriseId"],
    where: { createdAt: { gte: debut, lte: fin }, ...(entrepriseIds ? { entrepriseId: { in: entrepriseIds } } : {}) },
    _count: { _all: true },
  });
  return new Map(groupes.map((g) => [g.entrepriseId, g._count._all]));
}

export type ResultatFacture = { montant: number; details: string[] };

/** Montant d'un mois pour une entreprise : abonnement RH, formule paie, suppléments, arrivées/sorties, tickets */
export async function calculerFacture(entrepriseId: string, mois: number, annee: number): Promise<ResultatFacture | null> {
  const entreprise = await prisma.entreprise.findUnique({
    where: { id: entrepriseId },
    include: { abonnement: true, abonnementPaie: true },
  });
  if (!entreprise) return null;
  const abo = entreprise.abonnement;
  const paie = entreprise.abonnementPaie;
  if (!abo && !paie) return { montant: 0, details: [] };

  const { debut, fin } = bornesMois(mois, annee);
  const [nbSalaries, nbTickets, nbEntrees, nbSorties] = await Promise.all([
    prisma.salarie.count({
      where: {
        entrepriseId,
        statut: "Actif",
        dateDebut: { lte: fin },
        OR: [{ dateFin: null }, { dateFin: { gte: debut } }],
      },
    }),
    ticketsDuMois(entrepriseId, mois, annee),
    paie && !paie.entreesSortiesIncluses
      ? prisma.salarie.count({ where: { entrepriseId, dateDebut: { gte: debut, lte: fin } } })
      : Promise.resolve(0),
    paie && !paie.entreesSortiesIncluses
      ? prisma.salarie.count({ where: { entrepriseId, dateFin: { gte: debut, lte: fin } } })
      : Promise.resolve(0),
  ]);

  let montant = 0;
  const details: string[] = [];
  const ajouter = (libelle: string, cout: number) => {
    montant += cout;
    details.push(`${libelle} : ${Math.round(cout * 100) / 100} €`);
  };

  // ── Abonnement RH ──
  if (abo) {
    ajouter(abo.nom, abo.prixMensuel);
    const supp = Math.max(nbSalaries - abo.salariesInclus, 0);
    if (supp > 0 && abo.prixSalarieSupp > 0) {
      ajouter(`${nbSalaries} salariés dont ${supp} supp. (${abo.prixSalarieSupp} €)`, supp * abo.prixSalarieSupp);
    }
  }

  // ── Formule paie ──
  if (paie) {
    ajouter(`Paie ${paie.nom}`, paie.prixMensuel);
    const supp = Math.max(nbSalaries - paie.bulletinsInclus, 0);
    if (supp > 0 && paie.prixBulletinSupp > 0) {
      ajouter(`${nbSalaries} bulletins dont ${supp} supp. (${paie.prixBulletinSupp} €)`, supp * paie.prixBulletinSupp);
    }
    if (nbEntrees > 0 && paie.prixEntree > 0) ajouter(`${nbEntrees} arrivée(s) (${paie.prixEntree} €)`, nbEntrees * paie.prixEntree);
    if (nbSorties > 0 && paie.prixSortie > 0) ajouter(`${nbSorties} sortie(s) / solde de tout compte (${paie.prixSortie} €)`, nbSorties * paie.prixSortie);
  }

  // ── Option Espace salarié : 1 €/salarié avec un compte actif (incluse en Premium et Entreprise) ──
  if ((entreprise.permissions || []).includes("espace-salaries") && !paie?.espaceSalarieInclus) {
    const prix = paie?.prixEspaceSalarie ?? 1;
    const nbComptes = await prisma.utilisateur.count({
      where: {
        role: "SALARIE",
        actif: true,
        salarie: { entrepriseId, dateDebut: { lte: fin }, OR: [{ dateFin: null }, { dateFin: { gte: debut } }] },
      },
    });
    if (nbComptes > 0 && prix > 0) ajouter(`Espace salarié : ${nbComptes} salarié(s) × ${prix} €`, nbComptes * prix);
  }

  // ── Prestations commandées dans le mois (non annulées) ──
  const prestations = await prisma.commandePrestation.findMany({
    where: { entrepriseId, mois, annee, statut: { not: "ANNULEE" }, total: { gt: 0 } },
    orderBy: { createdAt: "asc" },
  });
  for (const pr of prestations) {
    ajouter(`Prestation : ${pr.libelle}${pr.quantite > 1 ? ` × ${pr.quantite}` : ""}${pr.salarie ? ` (${pr.salarie})` : ""}`, pr.total);
  }

  // ── Tickets RH du mois au-delà des tickets inclus ──
  const quota = quotaTickets(entreprise);
  const ticketsSupp = Math.max(nbTickets - quota.inclus, 0);
  if (ticketsSupp > 0 && quota.prixSupp > 0) {
    ajouter(`${nbTickets} ticket(s) RH dont ${ticketsSupp} supp. (${quota.prixSupp} €)`, ticketsSupp * quota.prixSupp);
  }

  return { montant: Math.round(montant * 100) / 100, details };
}
