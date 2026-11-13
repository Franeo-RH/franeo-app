// lib/demo-projets.ts
// Démo de l'option Projets : une année complète d'activité (projets terminés, en cours, à venir),
// avec planning, temps passés, frais et étapes clés : de quoi voir le coût et le gain de chaque projet et au global.
// Les montants et les temps sont générés de façon déterministe (même démo à chaque réinitialisation).

import { prisma } from "@/lib/prisma";

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
        entrepriseId, nom: m.nom, client: m.client, modele: m.modele, couleur: m.couleur, statut, dateDebut: debut, dateFin: fin,
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
