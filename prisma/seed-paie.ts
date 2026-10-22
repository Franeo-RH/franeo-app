import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.abonnementPaie.deleteMany();

  await prisma.abonnementPaie.createMany({
    data: [
      {
        code: "ESSENTIELLE",
        nom: "Paie Essentielle",
        couleur: "#3b82f6",
        prixMensuel: 149,
        bulletinsInclus: 10,
        prixBulletinSupp: 20,
        relancesVariables: false,
        relancesSalaries: false,
        modificationsIncluses: false,
        regularisationsInclus: false,
        demandesComplexes: false,
        veillePaie: false,
        conseilPaie: false,
        suiviRH: false,
        suiviIJSS: false,
        relancesIJSS: false,
        recouvrementIJSS: false,
        tableauBord: "none",
        pointPaie: false,
        recommandationsPaie: false,
        traitementPrioritaire: false,
        assistanceURSSAF: false,
      },
      {
        code: "SERENITE",
        nom: "Paie Sérénité",
        couleur: "#8b5cf6",
        prixMensuel: 299,
        bulletinsInclus: 15,
        prixBulletinSupp: 30,
        relancesVariables: true,
        relancesSalaries: true,
        modificationsIncluses: true,
        regularisationsInclus: true,
        demandesComplexes: false,
        veillePaie: true,
        conseilPaie: false,
        suiviRH: true,
        suiviIJSS: true,
        relancesIJSS: false,
        recouvrementIJSS: false,
        tableauBord: "simple",
        pointPaie: false,
        recommandationsPaie: false,
        traitementPrioritaire: true,
        assistanceURSSAF: false,
      },
      {
        code: "PREMIUM",
        nom: "Paie Premium",
        couleur: "#f59e0b",
        prixMensuel: 449,
        bulletinsInclus: 20,
        prixBulletinSupp: 40,
        relancesVariables: true,
        relancesSalaries: true,
        modificationsIncluses: true,
        regularisationsInclus: true,
        demandesComplexes: true,
        veillePaie: true,
        conseilPaie: true,
        suiviRH: true,
        suiviIJSS: true,
        relancesIJSS: true,
        recouvrementIJSS: true,
        tableauBord: "complet",
        pointPaie: true,
        recommandationsPaie: true,
        traitementPrioritaire: true,
        assistanceURSSAF: true,
      },
    ],
  });

  console.log("✅ Les 3 formules paie ont été créées !");
}

main().finally(() => prisma.$disconnect());