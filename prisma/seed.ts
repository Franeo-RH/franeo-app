import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {

  const abonnementBasic = await prisma.abonnement.create({
    data: {
      nom: "Basic",
      prixMensuel: 50,
      ticketsRH: 0,
      prixTicketSupp: 50,
      salariesInclus: 25,
      features: [
        "25 salariés inclus (+5€/salarié supp.)",
        "0 ticket RH inclus (50€/ticket supp.)",
        "Fiches salariés",
        "Gestion des informations salariés",
        "Reporting RH simple",
        "Accès Discord Franeo",
      ],
    },
  });

  await prisma.abonnement.create({
    data: {
      nom: "Essentiel",
      prixMensuel: 149,
      ticketsRH: 3,
      prixTicketSupp: 40,
      salariesInclus: 10,
      features: [
        "10 salariés supp. inclus (+10€/salarié supp.)",
        "3 tickets RH/mois (40€/ticket supp.)",
        "Saisie des absences",
        "Suivi des CDD & échéances contrats",
        "Aide à la rédaction de documents RH",
        "Conseil RH ponctuel",
        "Vivier de candidats",
      ],
    },
  });

  const abonnementSerenite = await prisma.abonnement.create({
    data: {
      nom: "Sérénité",
      prixMensuel: 299,
      ticketsRH: 5,
      prixTicketSupp: 30,
      salariesInclus: 20,
      features: [
        "20 salariés supp. inclus (+8€/salarié supp.)",
        "5 tickets RH/mois (30€/ticket supp.)",
        "Suivi des visites médicales",
        "Suivi des titres de séjour",
        "Audit RH initial",
        "Extraction des données",
        "Chatbot RH",
      ],
    },
  });

  await prisma.abonnement.create({
    data: {
      nom: "Premium",
      prixMensuel: 449,
      ticketsRH: 10,
      prixTicketSupp: 20,
      salariesInclus: 40,
      features: [
        "40 salariés supp. inclus (+6€/salarié supp.)",
        "10 tickets RH/mois (20€/ticket supp.)",
        "Point RH périodique",
        "Plan d'action RH annuel",
        "Accompagnement RH annuel",
        "Traitement prioritaire",
        "Synthèse des risques RH",
      ],
    },
  });

  const entreprise = await prisma.entreprise.create({
    data: {
      nom: "Entreprise Demo",
      siret: "12345678901234",
      email: "contact@demo.fr",
      telephone: "0123456789",
      rue: "1 rue de la Paix",
      codePostal: "75001",
      ville: "Paris",
      pays: "France",
      iban: "FR7630001007941234567890185",
      bic: "BNPAFRPP",
      banque: "BNP Paribas",
      abonnementId: abonnementSerenite.id,
    },
  });

  await prisma.utilisateur.create({
    data: {
      email: "admin@franeo.fr",
      motDePasse: await bcrypt.hash("admin123", 10),
      prenom: "Admin",
      role: "ADMIN",
    },
  });

  await prisma.utilisateur.create({
    data: {
      email: "client@demo.fr",
      motDePasse: await bcrypt.hash("client123", 10),
      prenom: "Lucas",
      role: "CLIENT",
      entrepriseId: entreprise.id,
    },
  });

  await prisma.salarie.create({
    data: {
      nom: "Dupont",
      prenom: "Marie",
      poste: "Comptable",
      typeContrat: "CDI",
      entrepriseId: entreprise.id,
    },
  });

  console.log("✅ Base de données peuplée !");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());