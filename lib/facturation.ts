// lib/facturation.ts
// Calcul unique du montant mensuel d'un client : sert à la génération des factures, à l'aperçu,
// aux estimations des dashboards et à la page « Prestations supplémentaires ». Une seule règle, partout.

import { prisma } from "@/lib/prisma";
import { PRIX_OPTION_DOCUMENTS, PRIX_OPTION_MEDICAL, PRIX_OPTION_PROJETS } from "@/lib/projets-constantes";
import { documentsInclus, medicalInclus, niveauPackPaie, niveauRH, PERMISSION_DOCUMENTS, PERMISSION_MEDICAL, projetsInclus } from "@/lib/droits";
import { GRILLE_RH } from "@/lib/grille";
import { categorieRecrutement, LANCEMENT_RECRUTEMENT } from "@/lib/recrutement";

type FormuleRH = { nom: string; prixMensuel: number; salariesInclus: number; prixSalarieSupp: number; ticketsRH: number; prixTicketSupp: number } | null;
type FormulePaie = {
  nom: string; prixMensuel: number; bulletinsInclus: number; prixBulletinSupp: number;
  entreesSortiesIncluses: boolean; prixEntree: number; prixSortie: number;
  ticketsRHInclus: number; prixTicketSupp: number;
} | null;

/** Accès de base gratuit (sans pack RH ni formule paie) : chaque ticket RH est facturé à l'unité */
export const PRIX_TICKET_SANS_ABONNEMENT = 70;
/** Anciens prix de l'option espace salarié (désormais incluse dans toutes les formules, plus facturée) */
export const PRIX_ESPACE_PAR_SALARIE = 3;
export const PRIX_ESPACE_FORFAIT = 15;

/**
 * Le pack RH est-il couvert par la formule paie ? (Paie Essentielle et Sérénité incluent RH Basic, Paie Premium inclut RH Sérénité.)
 * Dans ce cas, le pack RH n'est pas facturé en plus.
 */
export function packRHInclusDansPaie(e: { abonnement: { nom: string } | null; abonnementPaie: { nom: string } | null }): boolean {
  const pack = niveauPackPaie(e);
  return pack > 0 && (!e.abonnement || niveauRH(e) <= pack);
}

/** Tickets RH inclus chaque mois (pack RH, ou pack inclus dans la paie) et prix d'un ticket supplémentaire */
export function quotaTickets(e: { abonnement: FormuleRH; abonnementPaie: FormulePaie; cabinetId?: string | null }) {
  // Client suivi par un cabinet : aucun ticket RH (seulement le conseil RH ponctuel, inclus)
  if (e.cabinetId) return { inclus: 0, prixSupp: 0 };
  if (!e.abonnement && !e.abonnementPaie) return { inclus: 0, prixSupp: PRIX_TICKET_SANS_ABONNEMENT };
  // Tickets du pack RH dont le client profite : le sien, ou celui inclus dans la formule paie (RH Sérénité = 5 tickets)
  const pack = niveauPackPaie(e);
  const ticketsPack = packRHInclusDansPaie(e) ? GRILLE_RH[pack - 1]?.ticketsRH ?? 0 : e.abonnement?.ticketsRH || 0;
  const inclus = ticketsPack + (e.abonnementPaie?.ticketsRHInclus || 0);
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

export type CategorieLigne = "ABONNEMENT" | "OPTION" | "SALARIES" | "BULLETINS" | "ARRIVEES" | "SORTIES" | "ESPACE_SALARIE" | "PRESTATION" | "TICKETS" | "RECRUTEMENT" | "REMISE";

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
  OPTION: "Option",
  SALARIES: "Salariés supplémentaires",
  BULLETINS: "Bulletins supplémentaires",
  ARRIVEES: "Arrivées",
  SORTIES: "Sorties",
  ESPACE_SALARIE: "Espace salarié",
  PRESTATION: "Prestation complémentaire",
  TICKETS: "Tickets RH supplémentaires",
  RECRUTEMENT: "Recrutement",
  REMISE: "Remise",
};

const arrondi = (n: number) => Math.round(n * 100) / 100;

/** Remise du mois (remise permanente de la fiche ou remise datée) */
export type RemiseDatee = {
  id: string; libelle: string; motif: string; type: string; valeur: number; portee: string;
  moisDebut: number; anneeDebut: number; nbMois: number | null;
};

/** Rang du mois d'une remise datée (1 = premier mois), ou null si elle ne s'applique pas ce mois-ci */
export function rangRemise(r: Pick<RemiseDatee, "moisDebut" | "anneeDebut" | "nbMois">, mois: number, annee: number): number | null {
  const ecart = annee * 12 + (mois - 1) - (r.anneeDebut * 12 + (r.moisDebut - 1));
  if (ecart < 0) return null;
  if (r.nbMois != null && ecart >= r.nbMois) return null;
  return ecart + 1;
}

/** Catégories récurrentes sur lesquelles portent les remises « abonnements » */
const CATEGORIES_ABONNEMENT: CategorieLigne[] = ["ABONNEMENT", "OPTION", "SALARIES", "BULLETINS"];

/**
 * Ajoute les lignes de remise (montants négatifs) : remise permanente en %, puis remises datées.
 * Chaque remise est plafonnée à ce qui reste à payer sur sa base : la facture ne descend jamais sous 0.
 */
export function appliquerRemises(lignes: LigneFacture[], remisePct: number | null | undefined, remises: RemiseDatee[], mois: number, annee: number): LigneFacture[] {
  let resteAbo = lignes.filter((l) => CATEGORIES_ABONNEMENT.includes(l.categorie)).reduce((a, l) => a + l.total, 0);
  let resteTout = lignes.reduce((a, l) => a + l.total, 0);
  const sortie = [...lignes];
  const deduire = (libelle: string, montantVoulu: number, portee: string, refId?: string) => {
    const plafond = portee === "TOUT" ? resteTout : Math.min(resteAbo, resteTout);
    const m = arrondi(Math.min(Math.max(montantVoulu, 0), plafond));
    if (m <= 0) return;
    resteTout = arrondi(resteTout - m);
    resteAbo = arrondi(Math.max(resteAbo - m, 0));
    sortie.push({ categorie: "REMISE", libelle, quantite: 1, prixUnitaire: -m, total: -m, refId });
  };
  if (remisePct && remisePct > 0) {
    deduire(`Remise ${remisePct} % sur les abonnements`, (resteAbo * Math.min(remisePct, 100)) / 100, "ABONNEMENTS");
  }
  for (const r of remises) {
    const rang = rangRemise(r, mois, annee);
    if (rang == null || !(r.valeur > 0)) continue;
    const base = r.portee === "TOUT" ? resteTout : resteAbo;
    const voulu = r.type === "MONTANT" ? r.valeur : (base * Math.min(r.valeur, 100)) / 100;
    const duree = r.nbMois != null ? ` (mois ${rang}/${r.nbMois})` : "";
    deduire(`${r.libelle}${duree}`, voulu, r.portee, r.id);
  }
  return sortie;
}

type DonneesMois = Awaited<ReturnType<typeof chargerDonneesMois>>;

/** Toutes les données du mois en 7 requêtes, quel que soit le nombre d'entreprises */
async function chargerDonneesMois(mois: number, annee: number, entrepriseIds?: string[]) {
  const { debut, fin } = bornesMois(mois, annee);
  const filtre = entrepriseIds ? { entrepriseId: { in: entrepriseIds } } : {};
  const [entreprises, salaries, entrees, sorties, tickets, prestations, recrutements] = await Promise.all([
    prisma.entreprise.findMany({
      where: entrepriseIds ? { id: { in: entrepriseIds } } : {},
      include: { abonnement: true, abonnementPaie: true, remises: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.salarie.groupBy({
      by: ["entrepriseId"],
      where: { ...filtre, statut: "Actif", dateDebut: { lte: fin }, OR: [{ dateFin: null }, { dateFin: { gte: debut } }] },
      _count: { _all: true },
    }),
    prisma.salarie.groupBy({ by: ["entrepriseId"], where: { ...filtre, dateDebut: { gte: debut, lte: fin } }, _count: { _all: true } }),
    prisma.salarie.groupBy({ by: ["entrepriseId"], where: { ...filtre, dateFin: { gte: debut, lte: fin } }, _count: { _all: true } }),
    ticketsDuMoisParEntreprise(mois, annee, entrepriseIds),
    prisma.commandePrestation.findMany({
      where: { ...filtre, mois, annee, statut: { not: "ANNULEE" }, total: { gt: 0 } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.demandeRecrutement.findMany({
      where: {
        ...filtre,
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
  const compte = (g: { entrepriseId: string; _count: { _all: number } }[]) => new Map(g.map((x) => [x.entrepriseId, x._count._all]));
  const grouper = <T extends { entrepriseId: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) m.set(r.entrepriseId, [...(m.get(r.entrepriseId) ?? []), r]);
    return m;
  };
  return {
    debut, fin, entreprises,
    salaries: compte(salaries), entrees: compte(entrees), sorties: compte(sorties), tickets,
    prestations: grouper(prestations), recrutements: grouper(recrutements),
  };
}

/** Lignes d'une entreprise à partir des données du mois déjà chargées */
function construireLignes(d: DonneesMois, entreprise: DonneesMois["entreprises"][number], mois: number, annee: number): LigneFacture[] {
  const { debut, fin } = d;
  const entrepriseId = entreprise.id;
  const abo = entreprise.abonnement;
  const paie = entreprise.abonnementPaie;
  const nbSalaries = d.salaries.get(entrepriseId) ?? 0;
  const nbTickets = d.tickets.get(entrepriseId) ?? 0;
  const nbEntrees = paie && !paie.entreesSortiesIncluses ? d.entrees.get(entrepriseId) ?? 0 : 0;
  const nbSorties = paie && !paie.entreesSortiesIncluses ? d.sorties.get(entrepriseId) ?? 0 : 0;
  const prestations = d.prestations.get(entrepriseId) ?? [];
  const recrutements = d.recrutements.get(entrepriseId) ?? [];

  const lignes: LigneFacture[] = [];
  const ajouter = (l: Omit<LigneFacture, "total"> & { total?: number }) => {
    const total = arrondi(l.total ?? l.quantite * l.prixUnitaire);
    if (total > 0) lignes.push({ ...l, total });
  };

  // ── Abonnements ──
  // Formule paie : elle inclut un pack RH (Basic, ou Sérénité avec Paie Premium) qui n'est alors pas facturé en plus
  const rhInclus = packRHInclusDansPaie(entreprise);
  if (abo && !rhInclus) {
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

  // Espace salarié : inclus dans toutes les formules (plus de supplément)

  // ── Options : facturées seulement si ni la formule RH ni la formule paie ne les incluent ──
  const permissions = entreprise.permissions || [];
  if (permissions.includes("projets") && !entreprise.demo && !projetsInclus(entreprise)) {
    ajouter({ categorie: "OPTION", libelle: "Option Projets, planning & rentabilité", quantite: 1, prixUnitaire: PRIX_OPTION_PROJETS });
  }
  if (permissions.includes(PERMISSION_DOCUMENTS) && !entreprise.demo && !documentsInclus(entreprise)) {
    ajouter({ categorie: "OPTION", libelle: "Option Documents & contrats (courriers types, contrats depuis modèle)", quantite: 1, prixUnitaire: PRIX_OPTION_DOCUMENTS });
  }
  if (permissions.includes(PERMISSION_MEDICAL) && !entreprise.demo && !medicalInclus(entreprise)) {
    ajouter({ categorie: "OPTION", libelle: "Option Suivi médical complet", quantite: 1, prixUnitaire: PRIX_OPTION_MEDICAL });
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
  const dansMois = (dt: Date | null) => !!dt && dt >= debut && dt <= fin;
  for (const r of recrutements) {
    const cat = categorieRecrutement(r.categorie);
    if (dansMois(r.createdAt)) ajouter({ categorie: "RECRUTEMENT", libelle: `Recrutement ${r.poste} — lancement`, quantite: 1, prixUnitaire: LANCEMENT_RECRUTEMENT });
    if (dansMois(r.signatureAt)) ajouter({ categorie: "RECRUTEMENT", libelle: `Recrutement ${r.poste} — prime signature du contrat`, quantite: 1, prixUnitaire: cat.signature });
    if (dansMois(r.finEssaiAt)) ajouter({ categorie: "RECRUTEMENT", libelle: `Recrutement ${r.poste} — prime fin de période d'essai`, quantite: 1, prixUnitaire: cat.finEssai });
  }

  // Client suivi par un cabinet comptable : pas de formule, ni options ni tickets facturés au client
  // (le cabinet est facturé selon son tarif sur mesure) ; seules les prestations à l'acte restent.
  const facturables = entreprise.cabinetId ? lignes.filter((l) => l.categorie === "PRESTATION" || l.categorie === "RECRUTEMENT") : lignes;

  // ── Remises (permanente de la fiche, puis remises datées : geste commercial, parrainage) ──
  return appliquerRemises(facturables, entreprise.remisePct, entreprise.remises, mois, annee);
}

/**
 * Lignes du mois pour plusieurs entreprises à la fois (toutes si aucune liste) : 7 requêtes au total,
 * au lieu de 7 par entreprise. À utiliser pour les tableaux de bord et les générations groupées.
 */
export async function lignesFacturesMois(mois: number, annee: number, entrepriseIds?: string[]): Promise<Map<string, LigneFacture[]>> {
  if (entrepriseIds && entrepriseIds.length === 0) return new Map();
  const d = await chargerDonneesMois(mois, annee, entrepriseIds);
  return new Map(d.entreprises.map((e) => [e.id, construireLignes(d, e, mois, annee)]));
}

/** Total d'une liste de lignes (remises déduites) */
export const totalLignes = (lignes: LigneFacture[]) => arrondi(lignes.reduce((a, l) => a + l.total, 0));

/** Montant du mois par entreprise (même calcul que la facture) */
export async function montantsMois(mois: number, annee: number, entrepriseIds?: string[]): Promise<Map<string, number>> {
  const parEntreprise = await lignesFacturesMois(mois, annee, entrepriseIds);
  return new Map([...parEntreprise].map(([id, lignes]) => [id, totalLignes(lignes)]));
}

/** Toutes les lignes du mois d'une entreprise : abonnements, suppléments, puis remises */
export async function lignesFacture(entrepriseId: string, mois: number, annee: number): Promise<LigneFacture[] | null> {
  const parEntreprise = await lignesFacturesMois(mois, annee, [entrepriseId]);
  return parEntreprise.get(entrepriseId) ?? null;
}

/** Texte d'une ligne pour le détail de la facture */
export function texteLigne(l: LigneFacture): string {
  if (l.categorie === "ABONNEMENT") return `${l.libelle} : ${l.total} €`;
  if (l.categorie === "REMISE") return `${l.libelle} : ${l.total} €`;
  return `${l.libelle}${l.quantite > 1 && l.categorie === "PRESTATION" ? ` × ${l.quantite}` : ""} (${l.quantite} × ${l.prixUnitaire} €) : ${l.total} €`;
}

/** Montant d'un mois pour une entreprise, avec le détail ligne par ligne (texte de la facture) */
export async function calculerFacture(entrepriseId: string, mois: number, annee: number): Promise<ResultatFacture | null> {
  const lignes = await lignesFacture(entrepriseId, mois, annee);
  if (!lignes) return null;
  return { montant: totalLignes(lignes), details: lignes.map(texteLigne) };
}
