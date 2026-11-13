// lib/demo-projets.ts
// Démo de l'option Projets : une année complète d'activité (projets terminés, en cours, à venir),
// avec planning, temps passés, frais et étapes clés : de quoi voir le coût et le gain de chaque projet et au global.
// Les montants et les temps sont générés de façon déterministe (même démo à chaque réinitialisation).

import { prisma } from "@/lib/prisma";
import { oublierSessions } from "@/lib/session";

type Membre = { id: string; cout: number };
export type EquipeDemo = { sophie: Membre; karim: Membre; julie: Membre; thomas: Membre; emma: Membre; lucas: Membre };

const J = 86400000;
const r2 = (n: number) => Math.round(n * 100) / 100;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Coût horaire chargé d'un salarié de démo (salaire × 1,4 ÷ heures mensuelles) */
export const coutDemo = (salaire: number, hebdo = 35) => r2((salaire * 1.4) / ((hebdo * 52) / 12));

type Modele = {
  nom: string; client: string | null; modele: string; mode: "FORFAIT" | "REGIE" | "RECURRENT" | "INTERNE";
  prix?: number; tj?: number; jours?: number; mensuel?: number;
  debut: number; duree: number | null; equipe: [keyof EquipeDemo, number][]; ratio: number;
  frais?: { libelle: string; categorie: string; prevu: number; reel: number }[];
  couleur: string; annule?: boolean;
};

const ADRESSES = ["12 rue Serpenoise, 57000 Metz", "8 place Stanislas, 54000 Nancy", "45 avenue Foch, 57000 Metz", "3 rue des Dominicains, 54000 Nancy", "Zone industrielle Nord, 57300 Hagondange", "18 rue du Pont-Mouja, 54000 Nancy", "Parc des Expositions, 57000 Metz"];

const PROJETS: Modele[] = [
  { nom: "Rénovation des bureaux Cabinet Dumas", client: "Cabinet Dumas", modele: "BTP", mode: "FORFAIT", prix: 24000, debut: -350, duree: 70, equipe: [["thomas", 30], ["lucas", 4]], ratio: 1.05, frais: [{ libelle: "Matériaux", categorie: "MATERIEL", prevu: 6000, reel: 6650 }], couleur: "#ea580c" },
  { nom: "Audit organisation RH Groupe Vial", client: "Groupe Vial", modele: "CONSEIL", mode: "FORFAIT", prix: 12500, debut: -320, duree: 45, equipe: [["sophie", 20], ["karim", 6]], ratio: 0.88, frais: [{ libelle: "Déplacements Lyon", categorie: "DEPLACEMENT", prevu: 600, reel: 540 }], couleur: "#2563eb" },
  { nom: "Site e-commerce Boutique Lina", client: "Boutique Lina", modele: "INFORMATIQUE", mode: "FORFAIT", prix: 15800, debut: -290, duree: 90, equipe: [["emma", 14], ["lucas", 6]], ratio: 1.4, frais: [{ libelle: "Licences et hébergement", categorie: "MATERIEL", prevu: 900, reel: 1250 }], couleur: "#9333ea" },
  { nom: "Maintenance préventive Agro Est", client: "Agro Est", modele: "MAINTENANCE", mode: "REGIE", tj: 420, jours: 30, debut: -270, duree: 120, equipe: [["thomas", 12]], ratio: 1, frais: [{ libelle: "Pièces détachées", categorie: "MATERIEL", prevu: 1500, reel: 1380 }], couleur: "#16a34a" },
  { nom: "Séminaire annuel Banque Rhin", client: "Banque Rhin", modele: "EVENEMENT", mode: "FORFAIT", prix: 9800, debut: -230, duree: 30, equipe: [["julie", 20], ["emma", 10]], ratio: 0.95, frais: [{ libelle: "Location salle et traiteur", categorie: "SOUS_TRAITANCE", prevu: 3200, reel: 3350 }], couleur: "#db2777" },
  { nom: "Mise en sécurité Entrepôt Sud", client: "Logistique Sud", modele: "BTP", mode: "FORFAIT", prix: 31000, debut: -200, duree: 100, equipe: [["thomas", 30], ["karim", 4]], ratio: 1.18, frais: [{ libelle: "Matériel de sécurité", categorie: "MATERIEL", prevu: 7800, reel: 8900 }, { libelle: "Nacelle (location)", categorie: "SOUS_TRAITANCE", prevu: 1200, reel: 1650 }], couleur: "#ca8a04" },
  { nom: "Accompagnement recrutements Optique Plus", client: "Optique Plus", modele: "CONSEIL", mode: "REGIE", tj: 550, jours: 20, debut: -170, duree: 120, equipe: [["sophie", 10]], ratio: 1.05, couleur: "#0891b2" },
  { nom: "Nettoyage Clinique des Lilas", client: "Clinique des Lilas", modele: "SERVICES", mode: "RECURRENT", mensuel: 1850, debut: -300, duree: null, equipe: [["julie", 6], ["emma", 4]], ratio: 1, frais: [{ libelle: "Produits d'entretien", categorie: "MATERIEL", prevu: 1800, reel: 1450 }], couleur: "#0d9488" },
  { nom: "Contrat infogérance Notaires Associés", client: "Notaires Associés", modele: "INFORMATIQUE", mode: "RECURRENT", mensuel: 650, debut: -210, duree: 360, equipe: [["lucas", 3]], ratio: 0.9, couleur: "#4f46e5" },
  { nom: "Refonte intranet Mutuelle Saône", client: "Mutuelle Saône", modele: "INFORMATIQUE", mode: "FORFAIT", prix: 22000, debut: -120, duree: 150, equipe: [["emma", 21], ["lucas", 8], ["karim", 3]], ratio: 1.12, frais: [{ libelle: "Licences", categorie: "MATERIEL", prevu: 1400, reel: 900 }], couleur: "#7c3aed" },
  { nom: "Extension atelier Menuiserie Roy", client: "Menuiserie Roy", modele: "BTP", mode: "FORFAIT", prix: 46000, debut: -90, duree: 140, equipe: [["thomas", 35], ["lucas", 5]], ratio: 0.95, frais: [{ libelle: "Matériaux de construction", categorie: "MATERIEL", prevu: 14000, reel: 9200 }, { libelle: "Grue (sous-traitance)", categorie: "SOUS_TRAITANCE", prevu: 2500, reel: 2500 }], couleur: "#c2410c" },
  { nom: "Formation des managers Transports Girard", client: "Transports Girard", modele: "EVENEMENT", mode: "FORFAIT", prix: 7400, debut: -45, duree: 60, equipe: [["sophie", 12], ["julie", 6]], ratio: 1, frais: [{ libelle: "Supports de formation", categorie: "MATERIEL", prevu: 350, reel: 120 }], couleur: "#be185d" },
  { nom: "Audit énergétique Hôtel du Parc", client: "Hôtel du Parc", modele: "MAINTENANCE", mode: "FORFAIT", prix: 8600, debut: -25, duree: 50, equipe: [["thomas", 10], ["karim", 4]], ratio: 1.25, couleur: "#65a30d" },
  { nom: "Projet interne : certification qualité", client: null, modele: "LIBRE", mode: "INTERNE", debut: -150, duree: 200, equipe: [["karim", 4], ["sophie", 3]], ratio: 1, couleur: "#4b5563" },
  { nom: "Stand Foire de Metz", client: "Foire de Metz", modele: "EVENEMENT", mode: "FORFAIT", prix: 5200, debut: -60, duree: 20, equipe: [["julie", 10]], ratio: 0, couleur: "#9ca3af", annule: true },
  { nom: "Salon de l'habitat", client: "Habitat Expo", modele: "EVENEMENT", mode: "FORFAIT", prix: 14500, debut: 20, duree: 45, equipe: [["julie", 21], ["emma", 14]], ratio: 0, frais: [{ libelle: "Stand et mobilier", categorie: "SOUS_TRAITANCE", prevu: 4200, reel: 0 }], couleur: "#e11d48" },
  { nom: "Déploiement ERP Coopérative des Vosges", client: "Coopérative des Vosges", modele: "INFORMATIQUE", mode: "FORFAIT", prix: 38000, debut: 35, duree: 180, equipe: [["emma", 21], ["lucas", 10], ["sophie", 6]], ratio: 0, couleur: "#6d28d9" },
];

/** Bruit déterministe entre 0,85 et 1,15 */
const bruit = (i: number) => 0.85 + ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * 0.3;

export async function peuplerProjetsDemo(entrepriseId: string, equipe: EquipeDemo) {
  const auj = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const jour = (n: number) => new Date(auj.getTime() + n * J);
  const temps: { projetId: string; salarieId: string; jour: string; heures: number; commentaire: string }[] = [];
  let graine = 1;

  for (const m of PROJETS) {
    const debut = jour(m.debut);
    const fin = m.duree ? jour(m.debut + m.duree) : null;
    const statut = m.annule ? "ANNULE" : debut > auj ? "PREVU" : fin && fin < auj ? "TERMINE" : "EN_COURS";
    const finPlanning = fin ?? jour(m.debut + 365);
    const p = await prisma.projet.create({
      data: {
        entrepriseId, nom: m.nom, client: m.client, adresse: m.client ? ADRESSES[m.client.length % ADRESSES.length] : null, modele: m.modele, couleur: m.couleur, statut, dateDebut: debut, dateFin: fin,
        modeVente: m.mode, prixVente: m.prix ?? null, tauxJournalier: m.tj ?? null, joursVendus: m.jours ?? null, montantMensuel: m.mensuel ?? null,
        seuilAlerte: m.modele === "BTP" ? 75 : 80, responsableId: equipe.lucas.id,
        description: m.annule ? "Projet annulé par le client avant démarrage." : null,
        affectations: { create: m.equipe.map(([qui, h]) => ({ salarieId: equipe[qui].id, du: debut, au: new Date(finPlanning.getTime() + J - 1000), heuresSemaine: h })) },
        depenses: { create: (m.frais ?? []).flatMap((f) => [
          { libelle: f.libelle, categorie: f.categorie, montant: f.prevu, date: debut, prevu: true },
          ...(f.reel > 0 && debut < auj ? [{ libelle: `${f.libelle} (facture fournisseur)`, categorie: f.categorie, montant: f.reel, date: new Date(Math.min(debut.getTime() + 10 * J, auj.getTime())), prevu: false }] : []),
        ]) },
        jalons: { create: [
          { libelle: "Lancement", date: debut, etat: debut <= auj ? "FAIT" : "A_FAIRE", faitLe: debut <= auj ? debut : null },
          ...(m.duree && m.duree > 40 ? [{ libelle: "Point d'étape à mi-parcours", date: jour(m.debut + Math.round(m.duree / 2)), etat: jour(m.debut + Math.round(m.duree / 2)) <= auj && !m.annule ? "FAIT" : "A_FAIRE" }] : []),
          ...(fin ? [{ libelle: "Livraison / réception", date: fin, etat: fin <= auj && !m.annule ? "FAIT" : "A_FAIRE" }] : []),
        ] },
      },
    });

    // Temps passés : une saisie par salarié et par semaine, jusqu'à aujourd'hui
    if (m.ratio > 0 && debut < auj) {
      const finTemps = fin && fin < auj ? fin : auj;
      for (let t = debut.getTime(); t < finTemps.getTime(); t += 7 * J) {
        for (const [qui, h] of m.equipe) {
          const heures = r2(h * m.ratio * bruit(graine++));
          if (heures > 0) temps.push({ projetId: p.id, salarieId: equipe[qui].id, jour: iso(new Date(t)), heures: Math.min(24, heures), commentaire: "Semaine de travail" });
        }
      }
    }
  }
  // Les temps sont enregistrés en une seule fois (plus rapide)
  for (let i = 0; i < temps.length; i += 500) await prisma.tempsProjet.createMany({ data: temps.slice(i, i + 500) });
}

/** Matricules des salariés de démo utilisés par les projets */
const MATRICULES = { sophie: "DEMO-001", karim: "DEMO-002", julie: "DEMO-003", thomas: "DEMO-004", emma: "DEMO-005", lucas: "DEMO-006" } as const;

/** Crée tous les projets de démo (4 projets détaillés + une année d'activité) */
export async function semerProjetsDemo(entrepriseId: string) {
  const sal = await prisma.salarie.findMany({ where: { entrepriseId, matricule: { in: Object.values(MATRICULES) } }, select: { id: true, matricule: true } });
  const id = (m: string) => sal.find((x) => x.matricule === m)?.id;
  if (Object.values(MATRICULES).some((m) => !id(m))) return; // démo incomplète : rien à faire
  const sophie = { id: id(MATRICULES.sophie)! }, karim = { id: id(MATRICULES.karim)! }, julie = { id: id(MATRICULES.julie)! };
  const thomas = { id: id(MATRICULES.thomas)! }, emma = { id: id(MATRICULES.emma)! }, lucas = { id: id(MATRICULES.lucas)! };
  const jour = (n: number) => new Date(Date.now() + n * J);
  const jj = (n: number) => new Date(jour(n).toISOString().slice(0, 10) + "T00:00:00Z");
  const ref = (n: number) => jour(n).toISOString().slice(0, 10);
  const p1 = await prisma.projet.create({ data: {
    entrepriseId, nom: "Audit maintenance usine Lille", code: "P-001", adresse: "Rue de l'Usine, 59000 Lille", client: "Industries du Nord", couleur: "#2563eb", statut: "EN_COURS",
    dateDebut: jj(-30), dateFin: jj(30), modeVente: "FORFAIT", prixVente: 18000, responsableId: lucas.id, seuilAlerte: 80,
    description: "Audit complet des lignes et plan de maintenance préventive.",
    jalons: { create: [
      { libelle: "Lancement de l'audit", date: jj(-30), etat: "FAIT", faitLe: jj(-30) },
      { libelle: "Rapport intermédiaire", date: jj(-3), etat: "FAIT", faitLe: jj(-3) },
      { libelle: "Plan de maintenance final", date: jj(28) },
    ] },
    affectations: { create: [
      { salarieId: thomas.id, du: jj(-30), au: jj(30), heuresSemaine: 24, role: "Technicien" },
      { salarieId: sophie.id, du: jj(-30), au: jj(30), heuresSemaine: 6, role: "Suivi administratif" },
    ] },
    depenses: { create: [
      { libelle: "Déplacements Lille", categorie: "DEPLACEMENT", montant: 900, date: jj(-30), prevu: true },
      { libelle: "Train + hôtel semaine 1", categorie: "DEPLACEMENT", montant: 412.5, date: jj(-25), prevu: false },
    ] },
    temps: { create: [-29, -22, -15, -8, -1].flatMap((n) => [
      { salarieId: thomas.id, jour: ref(n), heures: 21, commentaire: "Relevés sur site (semaine)" },
      { salarieId: sophie.id, jour: ref(n), heures: 5, commentaire: "Comptes rendus" },
    ]) },
  } });
  await prisma.projet.create({ data: {
    entrepriseId, nom: "Salon Expo Paris 2026", code: "P-002", adresse: "1 place de la Porte de Versailles, 75015 Paris", client: "Client Événementiel SAS", couleur: "#db2777", statut: "EN_COURS",
    dateDebut: jj(-20), dateFin: jj(10), modeVente: "REGIE", tauxJournalier: 350, joursVendus: 12, budgetHeures: 84, responsableId: lucas.id, seuilAlerte: 80,
    jalons: { create: [
      { libelle: "Montage du stand", date: jj(-8), etat: "A_FAIRE" },
      { libelle: "Bilan du salon avec le client", date: jj(10) },
    ] },
    affectations: { create: [
      { salarieId: julie.id, du: jj(-20), au: jj(10), heuresSemaine: 21, role: "Accueil stand" },
      { salarieId: emma.id, du: jj(-20), au: jj(10), heuresSemaine: 14, role: "Communication" },
    ] },
    depenses: { create: [
      { libelle: "Location stand", categorie: "MATERIEL", montant: 1200, date: jj(-18), prevu: true },
      { libelle: "Location stand (facture)", categorie: "MATERIEL", montant: 1450, date: jj(-15), prevu: false },
    ] },
    temps: { create: [-19, -12, -5].flatMap((n) => [
      { salarieId: julie.id, jour: ref(n), heures: 26, commentaire: "Préparation et salon" },
      { salarieId: emma.id, jour: ref(n), heures: 16 },
    ]) },
  } });
  await prisma.projet.create({ data: {
    entrepriseId, nom: "Migration du logiciel comptable", code: "INT-01", couleur: "#16a34a", statut: "PREVU",
    dateDebut: jj(14), dateFin: jj(60), modeVente: "INTERNE", responsableId: karim.id,
    affectations: { create: [{ salarieId: karim.id, du: jj(14), au: jj(60), heuresSemaine: 10, role: "Pilote" }] },
  } });
  // Contrat récurrent d'entretien
  await prisma.projet.create({ data: {
    entrepriseId, nom: "Entretien des bureaux Nord Immobilier", code: "C-001", client: "Nord Immobilier", couleur: "#0891b2", statut: "EN_COURS", modele: "SERVICES",
    dateDebut: jj(-75), modeVente: "RECURRENT", montantMensuel: 1200, seuilAlerte: 85, responsableId: sophie.id,
    affectations: { create: [{ salarieId: emma.id, du: jj(-75), au: jj(290), heuresSemaine: 6, role: "Suivi du contrat" }] },
    temps: { create: [-70, -63, -56, -49, -42, -35, -28, -21, -14, -7].map((n) => ({ salarieId: emma.id, jour: ref(n), heures: 8, commentaire: "Passage hebdomadaire" })) },
  } });
  // Une année complète d'activité : 17 projets de plus, avec temps et frais (lib/demo-projets.ts)
  await peuplerProjetsDemo(entrepriseId, {
    sophie: { id: sophie.id, cout: coutDemo(3200) }, karim: { id: karim.id, cout: coutDemo(2900) }, julie: { id: julie.id, cout: coutDemo(2300) },
    thomas: { id: thomas.id, cout: coutDemo(2600, 39) }, emma: { id: emma.id, cout: coutDemo(1200) }, lucas: { id: lucas.id, cout: coutDemo(2700) },
  });

  // Le train Paris-Lille de Julie (note de frais validée) est imputé à l'audit de Lille
  await prisma.noteFrais.updateMany({ where: { entrepriseId, salarieId: julie.id, statut: "Validé" }, data: { projetId: p1.id } });
}

/**
 * Démo déjà créée avant l'option Projets : ajoute l'option et les projets sans tout réinitialiser.
 * Ne fait rien si la démo a déjà des projets.
 */
export async function assurerProjetsDemo(entrepriseId: string) {
  const e = await prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { demo: true, permissions: true } });
  if (!e?.demo) return;
  if (!e.permissions.includes("projets")) {
    await prisma.entreprise.update({ where: { id: entrepriseId }, data: { permissions: { push: "projets" } } });
    oublierSessions();
  }
  if ((await prisma.projet.count({ where: { entrepriseId } })) === 0) await semerProjetsDemo(entrepriseId);
}
