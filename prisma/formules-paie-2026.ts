// Mise à jour des formules paie (grille du 28/10/2026). Ne supprime rien : les clients gardent leur formule,
// seuls les prix et les services sont mis à jour, et la formule « Entreprise » est créée.
// Lancer avec :  npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/formules-paie-2026.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const commun = {
  accesWebApp: true,
  prixEntree: 20,
  prixSortie: 20,
};

// Grille validée : régularisations, rappels, simulations et saisies sur salaire inclus partout.
// Les tickets RH non utilisés ne sont pas reportés d'un mois sur l'autre.
const FORMULES = [
  {
    code: "ESSENTIELLE", nom: "Paie Essentielle", couleur: "#3b82f6",
    prixMensuel: 199, bulletinsInclus: 10, prixBulletinSupp: 20,
    ticketsRHInclus: 1, prixTicketSupp: 40,
    espaceSalarieInclus: false, prixEspaceSalarie: 1,
    entreesSortiesIncluses: false,
    relancesVariables: false, relancesSalaries: false, modificationsIncluses: false, regularisationsInclus: true,
    demandesComplexes: false, veillePaie: false, conseilPaie: false, suiviRH: false, suiviIJSS: false,
    relancesIJSS: false, recouvrementIJSS: false, tableauBord: "simple",
    pointPaie: false, recommandationsPaie: false, traitementPrioritaire: false, assistanceURSSAF: false,
  },
  {
    code: "SERENITE", nom: "Paie Sérénité", couleur: "#8b5cf6",
    prixMensuel: 379, bulletinsInclus: 20, prixBulletinSupp: 19,
    ticketsRHInclus: 3, prixTicketSupp: 30,
    espaceSalarieInclus: false, prixEspaceSalarie: 1,
    entreesSortiesIncluses: false,
    relancesVariables: true, relancesSalaries: true, modificationsIncluses: false, regularisationsInclus: true,
    demandesComplexes: false, veillePaie: true, conseilPaie: false, suiviRH: true, suiviIJSS: true,
    relancesIJSS: false, recouvrementIJSS: false, tableauBord: "simple",
    pointPaie: false, recommandationsPaie: false, traitementPrioritaire: false, assistanceURSSAF: false,
  },
  {
    code: "PREMIUM", nom: "Paie Premium", couleur: "#f59e0b",
    prixMensuel: 659, bulletinsInclus: 35, prixBulletinSupp: 18,
    ticketsRHInclus: 6, prixTicketSupp: 20,
    espaceSalarieInclus: true, prixEspaceSalarie: 1,
    entreesSortiesIncluses: true,
    relancesVariables: true, relancesSalaries: true, modificationsIncluses: true, regularisationsInclus: true,
    demandesComplexes: true, veillePaie: true, conseilPaie: true, suiviRH: true, suiviIJSS: true,
    relancesIJSS: false, recouvrementIJSS: false, tableauBord: "complet",
    pointPaie: true, recommandationsPaie: false, traitementPrioritaire: false, assistanceURSSAF: false,
  },
  {
    code: "ENTREPRISE", nom: "Paie Entreprise", couleur: "#111827",
    prixMensuel: 899, bulletinsInclus: 50, prixBulletinSupp: 17,
    ticketsRHInclus: 10, prixTicketSupp: 20,
    espaceSalarieInclus: true, prixEspaceSalarie: 1,
    entreesSortiesIncluses: true,
    relancesVariables: true, relancesSalaries: true, modificationsIncluses: true, regularisationsInclus: true,
    demandesComplexes: true, veillePaie: true, conseilPaie: true, suiviRH: true, suiviIJSS: true,
    relancesIJSS: true, recouvrementIJSS: true, tableauBord: "complet",
    pointPaie: true, recommandationsPaie: true, traitementPrioritaire: false, assistanceURSSAF: true,
  },
];

async function main() {
  for (const f of FORMULES) {
    const { code, ...reste } = f;
    await prisma.abonnementPaie.upsert({
      where: { code },
      update: { ...commun, ...reste },
      create: { code, ...commun, ...reste },
    });
    console.log(`✔ ${f.nom} : ${f.prixMensuel} €/mois, ${f.bulletinsInclus} bulletins (+${f.prixBulletinSupp} €), ${f.ticketsRHInclus} ticket(s) RH (+${f.prixTicketSupp} €)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
