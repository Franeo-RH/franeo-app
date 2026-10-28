// lib/demo.ts
// Entreprise de démonstration partagée : création, remise à zéro, repérage.

import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export const EMAIL_DEMO = "demo@franeo-rh.com";
export const EMAIL_DEMO_SALARIE = "demo-salarie@franeo-rh.com";
export const NOM_DEMO = "Entreprise Démo";
export const LIMITE_SALARIES_DEMO = 30;
export const NOM_FAMILLE_DEMO = "Démo";

/** À utiliser avec getSession() : la session appartient-elle à l'entreprise de démonstration ? */
export function estSessionDemo(session: { entreprise?: { demo?: boolean } | null } | null | undefined): boolean {
  return !!session?.entreprise?.demo;
}

const JOUR = 86400000;

function aujourdhuiUTC(): number {
  const iso = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());
  return Date.parse(`${iso}T00:00:00Z`);
}

/** Date à J+n (minuit UTC, comme les formulaires de l'application) */
function jour(n: number): Date {
  return new Date(aujourdhuiUTC() + n * JOUR);
}

/** Crée l'entreprise et l'utilisateur démo s'ils n'existent pas. Ne touche pas aux données. */
async function assurerEntrepriseEtUtilisateur() {
  let entreprise = await prisma.entreprise.findFirst({ where: { demo: true } });

  const abonnement = await prisma.abonnement.findFirst({ orderBy: { prixMensuel: "asc" } });
  const paie =
    (await prisma.abonnementPaie.findFirst({ where: { code: "SERENITE" } })) ?? (await prisma.abonnementPaie.findFirst({ orderBy: { prixMensuel: "asc" } }));

  if (!entreprise) {
    entreprise = await prisma.entreprise.create({
      data: {
        nom: NOM_DEMO,
        demo: true,
        siret: "000 000 000 00000",
        email: EMAIL_DEMO,
        telephone: "01 00 00 00 00",
        rue: "1 rue de la Démo",
        codePostal: "75000",
        ville: "Paris",
        pays: "France",
        abonnementId: abonnement?.id ?? null,
        abonnementPaieId: paie?.id ?? null,
      },
    });
  } else {
    entreprise = await prisma.entreprise.update({
      where: { id: entreprise.id },
      data: {
        nom: NOM_DEMO,
        ticketsUtilises: 0,
        bulletinsUtilises: 0,
        abonnementId: abonnement?.id ?? null,
        abonnementPaieId: paie?.id ?? null,
      },
    });
  }

  // Mot de passe aléatoire non utilisable : on entre uniquement par le bouton « Tester la démo ».
  let utilisateur = await prisma.utilisateur.findUnique({ where: { email: EMAIL_DEMO } });
  if (!utilisateur) {
    utilisateur = await prisma.utilisateur.create({
      data: { email: EMAIL_DEMO, motDePasse: `!${randomBytes(24).toString("hex")}`, prenom: "Visiteur", role: "CLIENT", entrepriseId: entreprise.id },
    });
  } else if (utilisateur.entrepriseId !== entreprise.id || utilisateur.role !== "CLIENT") {
    utilisateur = await prisma.utilisateur.update({ where: { id: utilisateur.id }, data: { entrepriseId: entreprise.id, role: "CLIENT" } });
  }

  // L'option Espace salarié est toujours active sur la démo
  if (!entreprise.permissions.includes("espace-salaries")) {
    entreprise = await prisma.entreprise.update({ where: { id: entreprise.id }, data: { permissions: { push: "espace-salaries" } } });
  }

  return { entreprise, utilisateur };
}

/** Efface les données de l'entreprise démo (sauf les suggestions helpdesk) et remet un jeu de données de départ. */
export async function reinitialiserDemo(): Promise<{ entrepriseId: string; userId: string }> {
  const { entreprise, utilisateur } = await assurerEntrepriseEtUtilisateur();
  const entrepriseId = entreprise.id;

  /* 1) Nettoyage — uniquement l'entreprise démo */
  await prisma.variablePaie.deleteMany({ where: { entrepriseId } });
  await prisma.absence.deleteMany({ where: { entrepriseId } });
  await prisma.utilisateur.deleteMany({ where: { OR: [{ email: EMAIL_DEMO_SALARIE }, { role: "SALARIE", entrepriseId }] } });
  await prisma.salarie.deleteMany({ where: { entrepriseId } }); // supprime aussi échéances et documents
  await prisma.ticket.deleteMany({ where: { entrepriseId } }); // supprime aussi les messages
  await prisma.ticketSupport.deleteMany({ where: { entrepriseId, NOT: { categorie: "SUGGESTION" } } }); // on garde les suggestions des visiteurs
  await prisma.facturation.deleteMany({ where: { entrepriseId } });
  await prisma.demandeRecrutement.deleteMany({ where: { entrepriseId } });
  await prisma.demandeEvolution.deleteMany({ where: { entrepriseId } });
  await prisma.demandeEvolutionPaie.deleteMany({ where: { entrepriseId } });
  await prisma.buddyContexte.deleteMany({ where: { userId: utilisateur.id } });
  await prisma.lectureCommunication.deleteMany({ where: { utilisateurId: utilisateur.id } });
  await prisma.demandeSalarie.deleteMany({ where: { entrepriseId } });
  await prisma.commandePrestation.deleteMany({ where: { entrepriseId } });
  await prisma.devis.deleteMany({ where: { entrepriseId } });
  await prisma.questionRH.deleteMany({ where: { entrepriseId } });

  /* 2) Jeu de données */
  const mois = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", month: "numeric" }).format(new Date()));
  const annee = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric" }).format(new Date()));

  const base = { entrepriseId, statut: "Actif", pays: "France" };
  const creer = (d: Record<string, unknown>) => prisma.salarie.create({ data: { ...base, ...d } as any });

  const sophie = await creer({ matricule: "DEMO-001", prenom: "Sophie", nom: "Martin", poste: "Responsable administrative", typeContrat: "CDI", dateDebut: jour(-900), heuresHebdomadaires: 35, salaireMensuel: 3200, email: "sophie.martin@exemple.fr", telephone: "06 00 00 00 01", ville: "Paris" });
  const karim = await creer({ matricule: "DEMO-002", prenom: "Karim", nom: "Benali", poste: "Comptable", typeContrat: "CDI", dateDebut: jour(-600), heuresHebdomadaires: 35, salaireMensuel: 2900, email: "karim.benali@exemple.fr", ville: "Lyon" });
  const julie = await creer({ matricule: "DEMO-003", prenom: "Julie", nom: "Lambert", poste: "Assistante commerciale", typeContrat: "CDD", dateDebut: jour(-120), dateFin: jour(45), heuresHebdomadaires: 35, salaireMensuel: 2300, email: "julie.lambert@exemple.fr", ville: "Paris" });
  const thomas = await creer({ matricule: "DEMO-004", prenom: "Thomas", nom: "Girard", poste: "Technicien de maintenance", typeContrat: "CDI", dateDebut: jour(-1500), heuresHebdomadaires: 39, salaireMensuel: 2600, ville: "Lille" });
  const emma = await creer({ matricule: "DEMO-005", prenom: "Emma", nom: "Rousseau", poste: "Alternante marketing", typeContrat: "Alternance", dateDebut: jour(-200), dateFin: jour(240), heuresHebdomadaires: 35, salaireMensuel: 1200, ville: "Nantes" });
  const lucas = await creer({ matricule: "DEMO-006", prenom: "Lucas", nom: "Moreau", poste: "Commercial", typeContrat: "CDI", dateDebut: jour(-420), heuresHebdomadaires: 35, salaireMensuel: 2700, email: "lucas.moreau@exemple.fr", ville: "Bordeaux" });
  const chloe = await creer({ matricule: "DEMO-007", prenom: "Chloé", nom: "Petit", poste: "Stagiaire RH", typeContrat: "Stage", dateDebut: jour(-30), dateFin: jour(60), heuresHebdomadaires: 35, salaireMensuel: 700, ville: "Paris" });
  await creer({ matricule: "DEMO-008", prenom: "Nicolas", nom: "Fabre", poste: "Chef d'équipe", typeContrat: "CDI", dateDebut: jour(20), heuresHebdomadaires: 35, salaireMensuel: 3100, ville: "Marseille" });

  // Échéances de documents
  const rappel = (salarieId: string, type: string, date: Date, libelle?: string) =>
    prisma.rappelSalarie.create({ data: { salarieId, type, dateEcheance: date, libelle: libelle ?? null } });
  await rappel(karim.id, "VISITE_PERIODIQUE", jour(12));
  await rappel(sophie.id, "ENTRETIEN_ANNUEL", jour(40));
  await rappel(thomas.id, "HABILITATION", jour(-5), "Habilitation électrique");
  await rappel(emma.id, "AVENANT", jour(25));
  await rappel(lucas.id, "FORMATION", jour(70), "Sécurité routière");
  await rappel(julie.id, "VISITE_EMBAUCHE", jour(3));

  // Absences (en attente)
  await prisma.absence.create({ data: { salarieId: sophie.id, entrepriseId, type: "CONGE_PAYE", dateDebut: jour(10), dateFin: jour(14) } });
  await prisma.absence.create({ data: { salarieId: lucas.id, entrepriseId, type: "RTT", dateDebut: jour(3), dateFin: jour(3) } });
  await prisma.absence.create({ data: { salarieId: chloe.id, entrepriseId, type: "MALADIE", dateDebut: jour(-2), dateFin: jour(0) } });

  // Compte démo de l'espace salarié (Sophie Martin) + ses demandes
  await prisma.utilisateur.create({
    data: { email: EMAIL_DEMO_SALARIE, motDePasse: `!${randomBytes(24).toString("hex")}`, prenom: "Sophie", role: "SALARIE", entrepriseId, salarieId: sophie.id, actif: true } as any,
  });
  await prisma.absence.create({ data: { salarieId: sophie.id, entrepriseId, type: "RTT", dateDebut: jour(21), dateFin: jour(21), declareeParSalarie: true, commentaire: "Rendez-vous personnel" } });
  await prisma.absence.create({ data: { salarieId: sophie.id, entrepriseId, type: "CONGE_SANS_SOLDE", dateDebut: jour(-20), dateFin: jour(-19), declareeParSalarie: true, statut: "Refusé", motifRefus: "Période de clôture, merci de décaler." } });
  await prisma.absence.create({ data: { salarieId: sophie.id, entrepriseId, type: "CONGE_PAYE", dateDebut: jour(-40), dateFin: jour(-36), declareeParSalarie: true, statut: "Validé" } });

  // Relevé d'heures de Sophie : le mois en cours en brouillon (jours ouvrés passés, hors absences)
  {
    const r = await prisma.releveMois.create({ data: { salarieId: sophie.id, entrepriseId, mois, annee } });
    const auj = new Date();
    const lignes = [];
    for (let d = 1; d < auj.getDate(); d++) {
      const date = new Date(Date.UTC(annee, mois - 1, d, 12));
      const js = date.getUTCDay();
      if (js === 0 || js === 6) continue;
      lignes.push({ releveId: r.id, date, heures: d % 5 === 0 ? 9 : 7, heuresSupp: d % 5 === 0 ? 2 : 0, commentaire: d % 5 === 0 ? "Clôture" : null });
    }
    if (lignes.length) await prisma.releveJour.createMany({ data: lignes });
  }

  // Variables de paie du mois
  await prisma.variablePaie.create({ data: { salarieId: lucas.id, entrepriseId, type: "PRIME", valeur: 300, mois, annee } });
  await prisma.variablePaie.create({ data: { salarieId: thomas.id, entrepriseId, type: "HEURE_SUPPLEMENTAIRE", valeur: 6, mois, annee } });
  await prisma.variablePaie.create({ data: { salarieId: karim.id, entrepriseId, type: "NOTE_FRAIS", valeur: 84.5, mois, annee } });

  // Un ticket RH avec échange
  const ticket = await prisma.ticket.create({
    data: { entrepriseId, titre: "Question sur un avenant de contrat", description: "Pouvez-vous m'indiquer les mentions obligatoires d'un avenant pour un changement d'horaires ?" },
  });
  await prisma.messageTicket.create({ data: { ticketId: ticket.id, contenu: "Bonjour, voici la marche à suivre : l'avenant doit préciser la nouvelle répartition des horaires et être signé par les deux parties.", auteur: "Équipe Franeo", role: "ADMIN" } });

  // Exemples de demandes de validation (vues côté client dans « Mes demandes »)
  await prisma.demandeSalarie.create({
    data: {
      entrepriseId, type: "AJOUT", statut: "EN_ATTENTE", auteur: "Démo",
      resume: "Inès Garnier — Chargée de recrutement, CDI, entrée le " + jour(14).toLocaleDateString("fr-FR") + ", 2 600 € brut/mois",
      donnees: { prenom: "Inès", nom: "Garnier", poste: "Chargée de recrutement", typeContrat: "CDI", dateDebut: jour(14).toISOString(), salaireMensuel: 2600 },
    },
  });
  await prisma.demandeSalarie.create({
    data: {
      entrepriseId, type: "MODIFICATION", statut: "VALIDEE", auteur: "Démo", salarieId: karim.id, traiteAt: jour(-3),
      resume: "Modifier Karim Benali : salaire mensuel : 2800 → 2900",
    },
  });

  // Exemples de prestations commandées (Paie › Prestations)
  await prisma.commandePrestation.create({
    data: { entrepriseId, code: "RECTIFICATIF", libelle: "Bulletin rectificatif", quantite: 1, prixUnitaire: 15, total: 15, statut: "FAITE", salarie: "Thomas Girard", commentaire: "Heures supplémentaires transmises après la clôture.", auteur: "Démo", mois, annee, faiteAt: jour(-1) },
  });
  await prisma.commandePrestation.create({
    data: { entrepriseId, code: "ATTESTATION_MALADIE", libelle: "Attestation de salaire maladie / maternité", quantite: 1, prixUnitaire: 0, total: 0, statut: "A_FAIRE", salarie: "Chloé Petit", auteur: "Démo", mois, annee },
  });

  return { entrepriseId, userId: utilisateur.id };
}

/** Prépare la démo côté salarié : renvoie l'id du compte démo salarié (recrée la démo s'il manque). */
export async function preparerDemoSalarie(): Promise<string> {
  const compte = await prisma.utilisateur.findUnique({ where: { email: EMAIL_DEMO_SALARIE }, select: { id: true } });
  if (compte) return compte.id;
  await reinitialiserDemo();
  const cree = await prisma.utilisateur.findUnique({ where: { email: EMAIL_DEMO_SALARIE }, select: { id: true } });
  if (!cree) throw new Error("Compte démo salarié introuvable");
  return cree.id;
}

/** Prépare la démo pour un visiteur : crée tout si c'est la toute première fois. */
export async function preparerDemo(): Promise<{ entrepriseId: string; userId: string }> {
  const entreprise = await prisma.entreprise.findFirst({ where: { demo: true }, select: { id: true } });
  const utilisateur = await prisma.utilisateur.findUnique({ where: { email: EMAIL_DEMO }, select: { id: true } });
  if (!entreprise || !utilisateur) return reinitialiserDemo();
  return { entrepriseId: entreprise.id, userId: utilisateur.id };
}
