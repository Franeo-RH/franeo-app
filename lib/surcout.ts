// lib/surcout.ts
// Avant d'ajouter un salarié ou d'ouvrir un ticket RH : y a-t-il un supplément à payer ?
// Si oui, on renvoie le détail du surcoût et les formules supérieures qui pourraient revenir moins cher.

import { prisma } from "@/lib/prisma";
import { quotaTickets, ticketsDuMois } from "@/lib/facturation";

export type LigneSurcout = { libelle: string; quantite: number; prixUnitaire: number; total: number };

export type PropositionFormule = {
  type: "RH" | "PAIE";
  id: string;
  nom: string;
  prixMensuel: number;
  inclus: string; // ex. « 20 bulletins, 3 tickets RH / mois »
  coutMensuel: number; // coût mensuel total estimé avec cette formule (après l'ajout)
  difference: number; // par rapport au coût avec surcoût (négatif = économie)
  lien: string;
};

export type Surcout = {
  lignes: LigneSurcout[];
  surcoutMensuel: number;
  coutActuel: number;
  coutAvecSurcout: number;
  propositions: PropositionFormule[];
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const depasse = (n: number, inclus: number) => Math.max(n - inclus, 0);

/** Statut HTTP utilisé quand l'accord du client est requis */
export const STATUT_ACCORD_REQUIS = 402;

type RH = { id: string; nom: string; prixMensuel: number; salariesInclus: number; prixSalarieSupp: number; ticketsRH: number; prixTicketSupp: number };
type Paie = {
  id: string; nom: string; prixMensuel: number; bulletinsInclus: number; prixBulletinSupp: number;
  ticketsRHInclus: number; prixTicketSupp: number; entreesSortiesIncluses: boolean; prixEntree: number; prixSortie: number;
};

const coutRH = (f: RH | null, sal: number) => (f ? f.prixMensuel + depasse(sal, f.salariesInclus) * f.prixSalarieSupp : 0);
const coutPaie = (f: Paie | null, sal: number) => (f ? f.prixMensuel + depasse(sal, f.bulletinsInclus) * f.prixBulletinSupp : 0);
const coutTickets = (rh: RH | null, paie: Paie | null, tic: number) => {
  const q = quotaTickets({ abonnement: rh, abonnementPaie: paie });
  return depasse(tic, q.inclus) * q.prixSupp;
};
const coutTotal = (rh: RH | null, paie: Paie | null, sal: number, tic: number) =>
  coutRH(rh, sal) + coutPaie(paie, sal) + coutTickets(rh, paie, tic);

export async function evaluerSurcout(
  entrepriseId: string,
  ajout: { salaries?: number; tickets?: number }
): Promise<Surcout | null> {
  const plusSalaries = Math.max(ajout.salaries || 0, 0);
  const plusTickets = Math.max(ajout.tickets || 0, 0);
  if (plusSalaries === 0 && plusTickets === 0) return null;

  const maintenant = new Date();
  const [entreprise, nbSalaries, tickets, formulesRH, formulesPaie] = await Promise.all([
    prisma.entreprise.findUnique({
      where: { id: entrepriseId },
      include: { abonnement: true, abonnementPaie: true },
    }),
    prisma.salarie.count({
      where: { entrepriseId, statut: "Actif", OR: [{ dateFin: null }, { dateFin: { gte: maintenant } }] },
    }),
    ticketsDuMois(entrepriseId, maintenant.getMonth() + 1, maintenant.getFullYear()),
    prisma.abonnement.findMany({ orderBy: { prixMensuel: "asc" } }),
    prisma.abonnementPaie.findMany({ orderBy: { prixMensuel: "asc" } }),
  ]);
  if (!entreprise || entreprise.demo) return null;

  const abo = entreprise.abonnement;
  const paie = entreprise.abonnementPaie;
  const salariesApres = nbSalaries + plusSalaries;
  const ticketsApres = tickets + plusTickets;

  const lignes: LigneSurcout[] = [];
  if (abo && plusSalaries > 0) {
    const n = depasse(salariesApres, abo.salariesInclus) - depasse(nbSalaries, abo.salariesInclus);
    if (n > 0 && abo.prixSalarieSupp > 0) {
      lignes.push({ libelle: `Salarié(s) au-delà des ${abo.salariesInclus} inclus (formule ${abo.nom})`, quantite: n, prixUnitaire: abo.prixSalarieSupp, total: r2(n * abo.prixSalarieSupp) });
    }
  }
  if (paie && plusSalaries > 0) {
    const n = depasse(salariesApres, paie.bulletinsInclus) - depasse(nbSalaries, paie.bulletinsInclus);
    if (n > 0 && paie.prixBulletinSupp > 0) {
      lignes.push({ libelle: `Bulletin(s) de paie au-delà des ${paie.bulletinsInclus} inclus (formule ${paie.nom})`, quantite: n, prixUnitaire: paie.prixBulletinSupp, total: r2(n * paie.prixBulletinSupp) });
    }
  }
  if (plusTickets > 0) {
    const q = quotaTickets(entreprise);
    const n = depasse(ticketsApres, q.inclus) - depasse(tickets, q.inclus);
    if (n > 0 && q.prixSupp > 0) {
      lignes.push({ libelle: `Ticket(s) RH au-delà des ${q.inclus} inclus ce mois-ci`, quantite: n, prixUnitaire: q.prixSupp, total: r2(n * q.prixSupp) });
    }
  }
  if (lignes.length === 0) return null;

  const coutActuel = coutTotal(abo, paie, nbSalaries, tickets);
  const coutAvecSurcout = coutTotal(abo, paie, salariesApres, ticketsApres);

  const propositions: PropositionFormule[] = [];
  const surcoutSalaries = lignes.some((l) => l.libelle.startsWith("Salarié"));
  const surcoutBulletins = lignes.some((l) => l.libelle.startsWith("Bulletin"));
  const surcoutTickets = lignes.some((l) => l.libelle.startsWith("Ticket"));

  if (abo && (surcoutSalaries || (surcoutTickets && !paie))) {
    for (const f of formulesRH) {
      if (f.id === abo.id) continue;
      if (f.salariesInclus <= abo.salariesInclus && f.ticketsRH <= abo.ticketsRH) continue; // pas une formule supérieure
      const cout = coutTotal(f, paie, salariesApres, ticketsApres);
      propositions.push({
        type: "RH", id: f.id, nom: f.nom, prixMensuel: f.prixMensuel,
        inclus: `${f.salariesInclus} salariés, ${f.ticketsRH} tickets RH / mois`,
        coutMensuel: r2(cout), difference: r2(cout - coutAvecSurcout),
        lien: "/client/entreprise/abonnement",
      });
    }
  }
  if (paie && (surcoutBulletins || surcoutTickets)) {
    for (const f of formulesPaie) {
      if (f.id === paie.id) continue;
      if (f.bulletinsInclus <= paie.bulletinsInclus && f.ticketsRHInclus <= paie.ticketsRHInclus) continue;
      const cout = coutTotal(abo, f, salariesApres, ticketsApres);
      propositions.push({
        type: "PAIE", id: f.id, nom: f.nom, prixMensuel: f.prixMensuel,
        inclus: `${f.bulletinsInclus} bulletins, ${f.ticketsRHInclus} tickets RH / mois${f.entreesSortiesIncluses ? ", arrivées et sorties incluses" : ""}`,
        coutMensuel: r2(cout), difference: r2(cout - coutAvecSurcout),
        lien: "/client/abonnement-paie",
      });
    }
  }
  propositions.sort((a, b) => a.coutMensuel - b.coutMensuel);

  return {
    lignes,
    surcoutMensuel: r2(lignes.reduce((acc, l) => acc + l.total, 0)),
    coutActuel: r2(coutActuel),
    coutAvecSurcout: r2(coutAvecSurcout),
    propositions: propositions.slice(0, 4),
  };
}
