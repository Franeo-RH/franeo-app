// lib/surcout.ts
// Avant d'ajouter un salarié ou d'ouvrir un ticket RH : y a-t-il un supplément à payer ?
// Si oui, on renvoie le détail du surcoût et les formules supérieures qui pourraient revenir moins cher.

import { prisma } from "@/lib/prisma";

export type LigneSurcout = { libelle: string; quantite: number; prixUnitaire: number; total: number };

export type PropositionFormule = {
  type: "RH" | "PAIE";
  id: string;
  nom: string;
  prixMensuel: number;
  inclus: string; // ex. « 20 salariés, 10 tickets »
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

export async function evaluerSurcout(
  entrepriseId: string,
  ajout: { salaries?: number; tickets?: number }
): Promise<Surcout | null> {
  const plusSalaries = Math.max(ajout.salaries || 0, 0);
  const plusTickets = Math.max(ajout.tickets || 0, 0);
  if (plusSalaries === 0 && plusTickets === 0) return null;

  const maintenant = new Date();
  const [entreprise, nbSalaries, formulesRH, formulesPaie] = await Promise.all([
    prisma.entreprise.findUnique({
      where: { id: entrepriseId },
      include: { abonnement: true, abonnementPaie: true },
    }),
    prisma.salarie.count({
      where: { entrepriseId, statut: "Actif", OR: [{ dateFin: null }, { dateFin: { gte: maintenant } }] },
    }),
    prisma.abonnement.findMany({ orderBy: { prixMensuel: "asc" } }),
    prisma.abonnementPaie.findMany({ orderBy: { prixMensuel: "asc" } }),
  ]);
  if (!entreprise || entreprise.demo) return null;

  const abo = entreprise.abonnement;
  const paie = entreprise.abonnementPaie;
  const tickets = entreprise.ticketsUtilises || 0;
  const salariesApres = nbSalaries + plusSalaries;
  const ticketsApres = tickets + plusTickets;

  // Coût d'une formule RH / paie pour un nombre de salariés et de tickets donné
  const coutRH = (f: { prixMensuel: number; salariesInclus: number; prixSalarieSupp: number; ticketsRH: number; prixTicketSupp: number } | null, sal: number, tic: number) =>
    f ? f.prixMensuel + depasse(sal, f.salariesInclus) * f.prixSalarieSupp + depasse(tic, f.ticketsRH) * f.prixTicketSupp : 0;
  const coutPaie = (f: { prixMensuel: number; bulletinsInclus: number; prixBulletinSupp: number } | null, sal: number) =>
    f ? f.prixMensuel + depasse(sal, f.bulletinsInclus) * f.prixBulletinSupp : 0;

  const lignes: LigneSurcout[] = [];
  if (abo && plusSalaries > 0) {
    const n = depasse(salariesApres, abo.salariesInclus) - depasse(nbSalaries, abo.salariesInclus);
    if (n > 0 && abo.prixSalarieSupp > 0) {
      lignes.push({ libelle: `Salarié(s) au-delà des ${abo.salariesInclus} inclus (formule ${abo.nom})`, quantite: n, prixUnitaire: abo.prixSalarieSupp, total: r2(n * abo.prixSalarieSupp) });
    }
  }
  if (abo && plusTickets > 0) {
    const n = depasse(ticketsApres, abo.ticketsRH) - depasse(tickets, abo.ticketsRH);
    if (n > 0 && abo.prixTicketSupp > 0) {
      lignes.push({ libelle: `Ticket(s) RH au-delà des ${abo.ticketsRH} inclus (formule ${abo.nom})`, quantite: n, prixUnitaire: abo.prixTicketSupp, total: r2(n * abo.prixTicketSupp) });
    }
  }
  if (paie && plusSalaries > 0) {
    const n = depasse(salariesApres, paie.bulletinsInclus) - depasse(nbSalaries, paie.bulletinsInclus);
    if (n > 0 && paie.prixBulletinSupp > 0) {
      lignes.push({ libelle: `Bulletin(s) de paie au-delà des ${paie.bulletinsInclus} inclus (formule ${paie.nom})`, quantite: n, prixUnitaire: paie.prixBulletinSupp, total: r2(n * paie.prixBulletinSupp) });
    }
  }
  if (lignes.length === 0) return null;

  const coutActuel = coutRH(abo, nbSalaries, tickets) + coutPaie(paie, nbSalaries);
  const coutAvecSurcout = coutRH(abo, salariesApres, ticketsApres) + coutPaie(paie, salariesApres);
  const partPaieApres = coutPaie(paie, salariesApres);
  const partRHApres = coutRH(abo, salariesApres, ticketsApres);

  const propositions: PropositionFormule[] = [];
  const surcoutRH = lignes.some((l) => l.libelle.includes("Salarié") || l.libelle.includes("Ticket"));
  const surcoutPaie = lignes.some((l) => l.libelle.includes("Bulletin"));

  if (surcoutRH && abo) {
    for (const f of formulesRH) {
      if (f.id === abo.id) continue;
      if (f.salariesInclus <= abo.salariesInclus && f.ticketsRH <= abo.ticketsRH) continue; // pas une formule supérieure
      const cout = coutRH(f, salariesApres, ticketsApres) + partPaieApres;
      propositions.push({
        type: "RH", id: f.id, nom: f.nom, prixMensuel: f.prixMensuel,
        inclus: `${f.salariesInclus} salariés, ${f.ticketsRH} tickets RH / mois`,
        coutMensuel: r2(cout), difference: r2(cout - coutAvecSurcout),
        lien: "/client/entreprise/abonnement",
      });
    }
  }
  if (surcoutPaie && paie) {
    for (const f of formulesPaie) {
      if (f.id === paie.id || f.bulletinsInclus <= paie.bulletinsInclus) continue;
      const cout = partRHApres + coutPaie(f, salariesApres);
      propositions.push({
        type: "PAIE", id: f.id, nom: f.nom, prixMensuel: f.prixMensuel,
        inclus: `${f.bulletinsInclus} bulletins / mois`,
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
