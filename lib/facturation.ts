// lib/facturation.ts
// Calcul unique du montant mensuel d'un client : sert à la génération des factures, à l'aperçu,
// aux estimations des dashboards et à la page « Prestations supplémentaires ». Une seule règle, partout.

import { prisma } from "@/lib/prisma";
import { categorieRecrutement, LANCEMENT_RECRUTEMENT } from "@/lib/recrutement";

type FormuleRH = { nom: string; prixMensuel: number; salariesInclus: number; prixSalarieSupp: number; ticketsRH: number; prixTicketSupp: number } | null;
type FormulePaie = {
  nom: string; prixMensuel: number; bulletinsInclus: number; prixBulletinSupp: number;
  entreesSortiesIncluses: boolean; prixEntree: number; prixSortie: number;
  ticketsRHInclus: number; prixTicketSupp: number;
} | null;

/** Accès de base gratuit (sans pack RH ni formule paie) : chaque ticket RH est facturé à l'unité */
export const PRIX_TICKET_SANS_ABONNEMENT = 70;

/** Tickets RH inclus chaque mois (abonnement RH + formule paie) et prix d'un ticket supplémentaire */
export function quotaTickets(e: { abonnement: FormuleRH; abonnementPaie: FormulePaie }) {
  if (!e.abonnement && !e.abonnementPaie) return { inclus: 0, prixSupp: PRIX_TICKET_SANS_ABONNEMENT };
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

export type CategorieLigne = "ABONNEMENT" | "SALARIES" | "BULLETINS" | "ARRIVEES" | "SORTIES" | "ESPACE_SALARIE" | "PRESTATION" | "TICKETS" | "RECRUTEMENT";

export type LigneFacture = {
  categorie: CategorieLigne;
  libelle: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
  /** id de la commande de prestation (pour les boutons de suivi) */
  refId?: string;
  statut?: string;
};

export const LIBELLES_CATEGORIE: Record<CategorieLigne, string> = {
  ABONNEMENT: "Abonnement",
  SALARIES: "Salariés supplémentaires",
  BULLETINS: "Bulletins supplémentaires",
  ARRIVEES: "Arrivées",
  SORTIES: "Sorties",
  ESPACE_SALARIE: "Espace salarié",
  PRESTATION: "Prestation complémentaire",
  TICKETS: "Tickets RH supplémentaires",
  RECRUTEMENT: "Recrutement",
};

const arrondi = (n: number) => Math.round(n * 100) / 100;

/** Toutes les lignes du mois : abonnements puis suppléments */
export async function lignesFacture(entrepriseId: string, mois: number, annee: number): Promise<LigneFacture[] | null> {
  const entreprise = await prisma.entreprise.findUnique({
    where: { id: entrepriseId },
    include: { abonnement: true, abonnementPaie: true },
  });
  if (!entreprise) return null;
  const abo = entreprise.abonnement;
  const paie = entreprise.abonnementPaie;

  const { debut, fin } = bornesMois(mois, annee);
  const avecEspace = (entreprise.permissions || []).includes("espace-salaries") && !paie?.espaceSalarieInclus;
  const [nbSalaries, nbTickets, nbEntrees, nbSorties, nbComptes, prestations, recrutements] = await Promise.all([
    prisma.salarie.count({
      where: { entrepriseId, statut: "Actif", dateDebut: { lte: fin }, OR: [{ dateFin: null }, { dateFin: { gte: debut } }] },
    }),
    ticketsDuMois(entrepriseId, mois, annee),
    paie && !paie.entreesSortiesIncluses
      ? prisma.salarie.count({ where: { entrepriseId, dateDebut: { gte: debut, lte: fin } } })
      : Promise.resolve(0),
    paie && !paie.entreesSortiesIncluses
      ? prisma.salarie.count({ where: { entrepriseId, dateFin: { gte: debut, lte: fin } } })
      : Promise.resolve(0),
    avecEspace
      ? prisma.utilisateur.count({
          where: { role: "SALARIE", actif: true, salarie: { entrepriseId, dateDebut: { lte: fin }, OR: [{ dateFin: null }, { dateFin: { gte: debut } }] } },
        })
      : Promise.resolve(0),
    prisma.commandePrestation.findMany({
      where: { entrepriseId, mois, annee, statut: { not: "ANNULEE" }, total: { gt: 0 } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.demandeRecrutement.findMany({
      where: {
        entrepriseId,
        facturationAuto: true,
        OR: [
          { createdAt: { gte: debut, lte: fin } },
          { signatureAt: { gte: debut, lte: fin } },
          { finEssaiAt: { gte: debut, lte: fin } },
        ],
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const lignes: LigneFacture[] = [];
  const ajouter = (l: Omit<LigneFacture, "total"> & { total?: number }) => {
    const total = arrondi(l.total ?? l.quantite * l.prixUnitaire);
    if (total > 0) lignes.push({ ...l, total });
  };

  // ── Abonnements ──
  if (abo) {
    ajouter({ categorie: "ABONNEMENT", libelle: abo.nom, quantite: 1, prixUnitaire: abo.prixMensuel });
    const supp = Math.max(nbSalaries - abo.salariesInclus, 0);
    if (supp > 0) ajouter({ categorie: "SALARIES", libelle: `${nbSalaries} salariés dont ${supp} supp.`, quantite: supp, prixUnitaire: abo.prixSalarieSupp });
  }
  if (paie) {
    ajouter({ categorie: "ABONNEMENT", libelle: `Paie ${paie.nom}`, quantite: 1, prixUnitaire: paie.prixMensuel });
    const supp = Math.max(nbSalaries - paie.bulletinsInclus, 0);
    if (supp > 0) ajouter({ categorie: "BULLETINS", libelle: `${nbSalaries} bulletins dont ${supp} supp.`, quantite: supp, prixUnitaire: paie.prixBulletinSupp });
    if (nbEntrees > 0) ajouter({ categorie: "ARRIVEES", libelle: `${nbEntrees} arrivée(s)`, quantite: nbEntrees, prixUnitaire: paie.prixEntree });
    if (nbSorties > 0) ajouter({ categorie: "SORTIES", libelle: `${nbSorties} sortie(s) / solde de tout compte`, quantite: nbSorties, prixUnitaire: paie.prixSortie });
  }

  // ── Option Espace salarié : 1 €/salarié avec un compte actif (incluse en Premium et Entreprise) ──
  if (avecEspace && nbComptes > 0) {
    const prix = paie?.prixEspaceSalarie ?? 1;
    ajouter({ categorie: "ESPACE_SALARIE", libelle: `Espace salarié : ${nbComptes} salarié(s)`, quantite: nbComptes, prixUnitaire: prix });
  }

  // ── Prestations commandées dans le mois (non annulées) ──
  for (const pr of prestations) {
    ajouter({
      categorie: "PRESTATION",
      libelle: `${pr.libelle}${pr.salarie ? ` (${pr.salarie})` : ""}`,
      quantite: pr.quantite,
      prixUnitaire: pr.prixUnitaire,
      total: pr.total,
      refId: pr.id,
      statut: pr.statut,
    });
  }

  // ── Tickets RH du mois au-delà des tickets inclus ──
  {
    const quota = quotaTickets(entreprise);
    const ticketsSupp = Math.max(nbTickets - quota.inclus, 0);
    if (ticketsSupp > 0) {
      const libelle = !abo && !paie ? `${nbTickets} ticket(s) RH à l'unité (accès de base, sans abonnement)` : `${nbTickets} ticket(s) RH dont ${ticketsSupp} supp.`;
      ajouter({ categorie: "TICKETS", libelle, quantite: ticketsSupp, prixUnitaire: quota.prixSupp });
    }
  }

  // ── Recrutements : lancement le mois de la demande, primes le mois où elles sont déclenchées ──
  const dansMois = (d: Date | null) => !!d && d >= debut && d <= fin;
  for (const r of recrutements) {
    const cat = categorieRecrutement(r.categorie);
    if (dansMois(r.createdAt)) ajouter({ categorie: "RECRUTEMENT", libelle: `Recrutement ${r.poste} — lancement`, quantite: 1, prixUnitaire: LANCEMENT_RECRUTEMENT });
    if (dansMois(r.signatureAt)) ajouter({ categorie: "RECRUTEMENT", libelle: `Recrutement ${r.poste} — prime signature du contrat`, quantite: 1, prixUnitaire: cat.signature });
    if (dansMois(r.finEssaiAt)) ajouter({ categorie: "RECRUTEMENT", libelle: `Recrutement ${r.poste} — prime fin de période d'essai`, quantite: 1, prixUnitaire: cat.finEssai });
  }

  return lignes;
}

/** Montant d'un mois pour une entreprise, avec le détail ligne par ligne (texte de la facture) */
export async function calculerFacture(entrepriseId: string, mois: number, annee: number): Promise<ResultatFacture | null> {
  const lignes = await lignesFacture(entrepriseId, mois, annee);
  if (!lignes) return null;
  const details = lignes.map((l) =>
    l.categorie === "ABONNEMENT"
      ? `${l.libelle} : ${l.total} €`
      : `${l.libelle}${l.quantite > 1 && l.categorie === "PRESTATION" ? ` × ${l.quantite}` : ""} (${l.quantite} × ${l.prixUnitaire} €) : ${l.total} €`
  );
  return { montant: arrondi(lignes.reduce((a, l) => a + l.total, 0)), details };
}
