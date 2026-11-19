// lib/demo-cabinet.ts
// Démo « cabinet comptable » : un cabinet fictif qui suit l'entreprise démo et trois petites entreprises démo.
// Tout est en consultation seule (même règle que la démo client).

import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { preparerDemo, EMAIL_DEMO_CABINET } from "@/lib/demo";

const NOM_CABINET = "Cabinet Démo Expertise";
const EMAIL_COLLAB = "demo-cabinet-collab@franeo-rh.com";
const jour = (n: number) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; };

type Fiche = { prenom: string; nom: string; poste: string; contrat: string; anciennete: number; salaire: number };
const CLIENTS: { nom: string; ville: string; salaries: Fiche[]; absences: number; variables: number; echeanceEnRetard: boolean; cloture: string | null }[] = [
  {
    nom: "Boulangerie Démo", ville: "Nancy", absences: 1, variables: 2, echeanceEnRetard: false, cloture: null,
    salaries: [
      { prenom: "Paul", nom: "Démo", poste: "Boulanger", contrat: "CDI", anciennete: 1200, salaire: 2100 },
      { prenom: "Inès", nom: "Démo", poste: "Vendeuse", contrat: "CDI", anciennete: 400, salaire: 1850 },
      { prenom: "Yanis", nom: "Démo", poste: "Apprenti boulanger", contrat: "Alternance", anciennete: 150, salaire: 1000 },
      { prenom: "Léa", nom: "Démo", poste: "Vendeuse", contrat: "CDD", anciennete: 60, salaire: 1800 },
    ],
  },
  {
    nom: "Garage Démo Auto", ville: "Metz", absences: 0, variables: 0, echeanceEnRetard: true, cloture: "DEMANDE_CLOTURE",
    salaries: [
      { prenom: "Marc", nom: "Démo", poste: "Chef d'atelier", contrat: "CDI", anciennete: 2500, salaire: 2900 },
      { prenom: "Sami", nom: "Démo", poste: "Mécanicien", contrat: "CDI", anciennete: 800, salaire: 2200 },
      { prenom: "Julien", nom: "Démo", poste: "Carrossier", contrat: "CDI", anciennete: 300, salaire: 2150 },
    ],
  },
  {
    nom: "Agence Démo Digital", ville: "Strasbourg", absences: 0, variables: 0, echeanceEnRetard: false, cloture: "CLOTURE",
    salaries: [
      { prenom: "Camille", nom: "Démo", poste: "Cheffe de projet", contrat: "CDI", anciennete: 900, salaire: 3100 },
      { prenom: "Nathan", nom: "Démo", poste: "Développeur", contrat: "CDI", anciennete: 500, salaire: 2900 },
      { prenom: "Zoé", nom: "Démo", poste: "Graphiste", contrat: "CDI", anciennete: 700, salaire: 2500 },
      { prenom: "Hugo", nom: "Démo", poste: "Stagiaire", contrat: "Stage", anciennete: 40, salaire: 700 },
    ],
  },
];

/** Crée la démo cabinet si besoin et renvoie l'id du compte du gérant fictif */
export async function preparerDemoCabinet(): Promise<string> {
  const { entrepriseId: principale } = await preparerDemo();

  let cabinet = await prisma.cabinet.findFirst({ where: { demo: true } });
  if (!cabinet) cabinet = await prisma.cabinet.create({ data: { nom: NOM_CABINET, demo: true, ville: "Nancy", email: EMAIL_DEMO_CABINET } });

  const abonnement = await prisma.abonnement.findFirst({ orderBy: { prixMensuel: "asc" } });
  const mois = new Date().getMonth() + 1, annee = new Date().getFullYear();
  const ids = [principale];

  for (const c of CLIENTS) {
    let e = await prisma.entreprise.findFirst({ where: { demo: true, nom: c.nom, cabinetId: cabinet.id } });
    if (!e) {
      e = await prisma.entreprise.create({
        data: { nom: c.nom, demo: true, ville: c.ville, pays: "France", cabinetId: cabinet.id, abonnementId: abonnement?.id ?? null, permissions: ["salaries", "paie", "tickets", "absences", "entreprise", "helpdesk", "espace-salaries"] },
      });
      const salaries = [];
      for (const s of c.salaries) {
        salaries.push(await prisma.salarie.create({
          data: { entrepriseId: e.id, statut: "Actif", pays: "France", ville: c.ville, prenom: s.prenom, nom: s.nom, poste: s.poste, typeContrat: s.contrat, dateDebut: jour(-s.anciennete), heuresHebdomadaires: 35, salaireMensuel: s.salaire } as never,
        }));
      }
      for (let i = 0; i < c.absences; i++) {
        await prisma.absence.create({ data: { salarieId: salaries[i].id, entrepriseId: e.id, type: "CONGE_PAYE", dateDebut: jour(8), dateFin: jour(12), declareeParSalarie: true } });
      }
      for (let i = 0; i < c.variables; i++) {
        await prisma.variablePaie.create({ data: { salarieId: salaries[i].id, entrepriseId: e.id, type: i % 2 ? "PRIME" : "HEURE_SUPPLEMENTAIRE", valeur: i % 2 ? 150 : 6, mois, annee } as never });
      }
      if (c.echeanceEnRetard) await prisma.rappelSalarie.create({ data: { salarieId: salaries[1].id, type: "VISITE_PERIODIQUE", dateEcheance: jour(-3) } });
      if (c.cloture) await prisma.clotureMois.create({ data: { entrepriseId: e.id, mois, annee, statut: c.cloture, auteur: "Démo" } });
    }
    ids.push(e.id);
  }
  await prisma.entreprise.update({ where: { id: principale }, data: { cabinetId: cabinet.id } });

  // Gérant fictif (on entre par le bouton « Tester la démo cabinet ») et un collaborateur limité à deux clients
  const mdp = () => `!${randomBytes(24).toString("hex")}`;
  let gerant = await prisma.utilisateur.findUnique({ where: { email: EMAIL_DEMO_CABINET } });
  if (!gerant) {
    gerant = await prisma.utilisateur.create({ data: { email: EMAIL_DEMO_CABINET, prenom: "Claire", role: "CABINET", cabinetId: cabinet.id, cabinetGerant: true, profilCabinet: "complet", motDePasse: mdp() } });
  }
  if (!(await prisma.utilisateur.findUnique({ where: { email: EMAIL_COLLAB }, select: { id: true } }))) {
    await prisma.utilisateur.create({
      data: { email: EMAIL_COLLAB, prenom: "Hugo (collaborateur)", role: "CABINET", cabinetId: cabinet.id, profilCabinet: "comptable", permissionsRetirees: ["salaries.creer", "salaries.supprimer", "salaries.importer", "tickets.recrutement", "espace.gerer"], clientsCabinet: ids.slice(1, 3), motDePasse: mdp() },
    });
  }
  return gerant.id;
}
