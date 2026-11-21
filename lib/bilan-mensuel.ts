// lib/bilan-mensuel.ts
// Bilan du mois écoulé envoyé le 1er du mois à chaque dirigeant (désactivable dans Mon entreprise).

import { prisma } from "@/lib/prisma";
import { envoyerMail } from "@/lib/notifications";
import { calculerFacture } from "@/lib/facturation";
import { MOIS_FR } from "@/lib/bulletins";

const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export async function bilanEntreprise(entrepriseId: string, mois: number, annee: number) {
  const debut = new Date(annee, mois - 1, 1), fin = new Date(annee, mois, 0, 23, 59, 59);
  const dans30 = new Date(Date.now() + 30 * 86400000);
  const [effectif, entrees, sorties, absences, variables, echeances, retards, tickets, facture, facturation] = await Promise.all([
    prisma.salarie.count({ where: { entrepriseId, statut: "Actif", dateDebut: { lte: fin }, OR: [{ dateFin: null }, { dateFin: { gte: fin } }] } }),
    prisma.salarie.count({ where: { entrepriseId, dateDebut: { gte: debut, lte: fin } } }),
    prisma.salarie.count({ where: { entrepriseId, dateFin: { gte: debut, lte: fin } } }),
    prisma.absence.count({ where: { entrepriseId, statut: { not: "Refusé" }, dateDebut: { lte: fin }, dateFin: { gte: debut } } }),
    prisma.variablePaie.count({ where: { entrepriseId, mois, annee } }),
    prisma.rappelSalarie.count({ where: { traite: false, dateEcheance: { gte: new Date(), lte: dans30 }, salarie: { entrepriseId, statut: "Actif" } } }),
    prisma.rappelSalarie.count({ where: { traite: false, dateEcheance: { lt: new Date() }, salarie: { entrepriseId, statut: "Actif" } } }),
    prisma.ticket.count({ where: { entrepriseId, statut: { not: "Clôturé" } } }),
    prisma.facturation.findFirst({ where: { entrepriseId, mois, annee }, select: { montant: true } }),
    calculerFacture(entrepriseId, mois, annee),
  ]);
  return { effectif, entrees, sorties, absences, variables, echeances, retards, tickets, montant: facture?.montant ?? facturation?.montant ?? 0 };
}

/** Envoie le bilan du mois précédent (une entreprise, ou toutes celles qui l'ont activé) */
export async function envoyerBilans(seulement?: string) {
  const ref = new Date(); ref.setDate(1); ref.setMonth(ref.getMonth() - 1);
  const mois = ref.getMonth() + 1, annee = ref.getFullYear();
  const entreprises = await prisma.entreprise.findMany({
    where: seulement ? { id: seulement } : { demo: false, actif: true, bilanMensuel: true },
    select: { id: true, nom: true, cabinetId: true },
  });
  let envoyes = 0;
  for (const e of entreprises) {
    const b = await bilanEntreprise(e.id, mois, annee);
    const comptes = await prisma.utilisateur.findMany({ where: { entrepriseId: e.id, role: "CLIENT", actif: true, etablissementId: null }, select: { email: true } });
    if (!comptes.length) continue;
    const ok = await envoyerMail({
      a: comptes.map((c) => c.email),
      sujet: `Votre bilan RH de ${MOIS_FR[mois - 1]} ${annee} — ${e.nom}`,
      titre: `📊 Votre mois de ${MOIS_FR[mois - 1]} en un coup d'œil`,
      lignes: [
        `👥 Effectif fin de mois : ${b.effectif} salarié(s)${b.entrees || b.sorties ? ` (${b.entrees} arrivée(s), ${b.sorties} départ(s))` : ""}.`,
        `🏖️ ${b.absences} absence(s) sur le mois · ✏️ ${b.variables} variable(s) de paie saisie(s).`,
        `⏰ ${b.echeances} échéance(s) dans les 30 prochains jours${b.retards ? ` · ⚠️ ${b.retards} en retard` : ""}.`,
        ...(b.tickets ? [`🎫 ${b.tickets} ticket(s) RH en cours.`] : []),
        ...(!e.cabinetId && b.montant ? [`🧾 Facture FRANEO RH du mois : ${eur(b.montant)}.`] : []),
        "Retrouvez le détail sur votre tableau de bord. (Ce bilan se désactive dans Mon entreprise.)",
      ],
      lien: "/client/dashboard",
      bouton: "Ouvrir mon tableau de bord",
    });
    if (ok) envoyes++;
  }
  return envoyes;
}
