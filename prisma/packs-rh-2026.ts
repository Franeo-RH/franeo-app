// Mise à jour des packs RH (grille du 28/10/2026). Ne supprime rien : les clients gardent leur pack.
// Lancer avec :  npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/packs-rh-2026.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PACKS = [
  {
    noms: ["Basic", "RH Basic"], nom: "Basic", prixMensuel: 50,
    salariesInclus: 25, prixSalarieSupp: 5, ticketsRH: 0, prixTicketSupp: 50,
    features: ["Jusqu'à 25 salariés (+5 €/salarié en plus)", "Ticket RH à 50 €", "Fiches salariés", "Suivi des échéances", "Application Franeo et assistant Buddy"],
  },
  {
    noms: ["Essentiel", "RH Essentiel"], nom: "Essentiel", prixMensuel: 149,
    salariesInclus: 15, prixSalarieSupp: 10, ticketsRH: 3, prixTicketSupp: 40,
    features: ["Jusqu'à 15 salariés (+10 €/salarié en plus)", "3 tickets RH/mois (40 € le ticket en plus)", "Espace SharePoint", "Saisie des absences", "Suivi des CDD & échéances"],
  },
  {
    noms: ["Sérénité", "RH Sérénité", "Serenite"], nom: "Sérénité", prixMensuel: 299,
    salariesInclus: 25, prixSalarieSupp: 8, ticketsRH: 5, prixTicketSupp: 30,
    features: ["Jusqu'à 25 salariés (+8 €/salarié en plus)", "5 tickets RH/mois (30 € le ticket en plus)", "Espace SharePoint", "Signatures électroniques Yousign illimitées", "Suivi des visites médicales"],
  },
  {
    noms: ["Premium", "RH Premium"], nom: "Premium", prixMensuel: 449,
    salariesInclus: 40, prixSalarieSupp: 6, ticketsRH: 10, prixTicketSupp: 20,
    features: ["Jusqu'à 40 salariés (+6 €/salarié en plus)", "10 tickets RH/mois (20 € le ticket en plus)", "Espace SharePoint", "Signatures électroniques Yousign illimitées", "Diagnostic RH initial"],
  },
];

async function main() {
  for (const { noms, ...p } of PACKS) {
    const existant = await prisma.abonnement.findFirst({ where: { nom: { in: noms } } });
    if (existant) {
      await prisma.abonnement.update({ where: { id: existant.id }, data: p });
      console.log(`✔ ${existant.nom} mis à jour : ${p.prixMensuel} €/mois`);
    } else {
      await prisma.abonnement.create({ data: p });
      console.log(`➕ ${p.nom} créé : ${p.prixMensuel} €/mois`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
