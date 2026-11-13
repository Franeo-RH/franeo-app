// lib/demo-projets.ts
// Démo de l'option Projets : une année complète d'activité (projets terminés, en cours, à venir),
// avec devis, planning, temps passés, frais, jalons, factures payées / en attente / en retard.
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
    const echeancier = m.mode === "FORFAIT" && m.prix
      ? [{ libelle: "Acompte à la commande (30 %)", jours: 0, pct: 30 }, { libelle: "Situation / livrable intermédiaire (40 %)", jours: Math.round((m.duree ?? 60) / 2), pct: 40 }, { libelle: "Solde à la livraison (30 %)", jours: m.duree ?? 60, pct: 30 }]
      : [];
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
          ...echeancier.map((e) => ({ libelle: e.libelle, date: jour(m.debut + e.jours), montant: r2((m.prix! * e.pct) / 100), facturation: "A_FACTURER", etat: jour(m.debut + e.jours) <= auj ? "FAIT" : "A_FAIRE" })),
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

  await facturerEtChiffrer(entrepriseId, equipe);
}

/**
 * Pour tous les projets de la démo : devis accepté d'origine, factures (échéances, régie mensuelle,
 * contrats mensuels) numérotées dans l'ordre chronologique, et quelques devis en attente / refusés.
 */
async function facturerEtChiffrer(entrepriseId: string, equipe: EquipeDemo) {
  const auj = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const jour = (n: number) => new Date(auj.getTime() + n * J);
  const couts = new Map(Object.values(equipe).map((x) => [x.id, x.cout]));
  const projets = await prisma.projet.findMany({
    where: { entrepriseId },
    include: { affectations: true, depenses: { where: { prevu: true } }, jalons: true, temps: { select: { jour: true, heures: true } } },
    orderBy: { dateDebut: "asc" },
  });

  type F = { projetId: string; jalonId?: string; type: string; date: Date; libelle: string; quantite: number; unite: string; pu: number; periodeDu?: string; periodeAu?: string };
  const factures: F[] = [];
  type D = { projetId: string | null; objet: string; client: string | null; modele: string | null; statut: string; date: Date; supplementaire?: boolean; lignes: { libelle: string; type: string; quantite: number; unite: string; coutUnitaire: number; prixUnitaire: number; salarieId: string | null }[]; acompte?: number | null };
  const devis: D[] = [];

  for (const p of projets) {
    if (p.statut === "ANNULE" && p.modeVente !== "INTERNE") {
      devis.push({ projetId: null, objet: p.nom, client: p.client, modele: p.modele, statut: "REFUSE", date: new Date(p.dateDebut.getTime() - 15 * J), lignes: [{ libelle: "Prestation complète", type: "FORFAIT", quantite: 1, unite: "forfait", coutUnitaire: r2((p.prixVente ?? 0) * 0.7), prixUnitaire: p.prixVente ?? 0, salarieId: null }] });
      continue;
    }
    if (p.modeVente === "INTERNE") continue;

    // Devis d'origine, chiffré au coût réel de l'équipe planifiée
    const finPlan = p.dateFin ?? new Date(p.dateDebut.getTime() + 365 * J);
    const semaines = Math.max(1, (finPlan.getTime() - p.dateDebut.getTime()) / (7 * J));
    const lignesMO = p.affectations.map((a) => ({ salarieId: a.salarieId, heures: r2(a.heuresSemaine * semaines), cout: couts.get(a.salarieId) ?? 25 }));
    const coutMO = lignesMO.reduce((t, l) => t + l.heures * l.cout, 0);
    const frais = p.depenses.map((d) => ({ libelle: d.libelle, cout: d.montant, prix: r2(d.montant * 1.25) }));
    const vendu = p.modeVente === "REGIE" ? (p.tauxJournalier ?? 0) * (p.joursVendus ?? 0) : p.modeVente === "RECURRENT" ? (p.montantMensuel ?? 0) * Math.max(1, Math.round(semaines / 4.33)) : p.prixVente ?? 0;
    const k = coutMO > 0 ? Math.max(1.05, (vendu - frais.reduce((t, f) => t + f.prix, 0)) / coutMO) : 1.3;
    const nomSal = (id: string) => Object.entries(equipe).find(([, v]) => v.id === id)?.[0] ?? "Équipe";
    devis.push({
      projetId: p.id, objet: p.nom, client: p.client, modele: p.modele, statut: "ACCEPTE", date: new Date(p.dateDebut.getTime() - 12 * J), acompte: p.modeVente === "FORFAIT" ? 30 : null,
      lignes: [
        ...lignesMO.map((l) => ({ libelle: `Main-d'œuvre (${nomSal(l.salarieId)})`, type: "MO", quantite: l.heures, unite: "h", coutUnitaire: l.cout, prixUnitaire: r2(l.cout * k), salarieId: l.salarieId })),
        ...frais.map((f) => ({ libelle: f.libelle, type: "ACHAT", quantite: 1, unite: "forfait", coutUnitaire: f.cout, prixUnitaire: f.prix, salarieId: null })),
      ],
    });

    // Factures
    if (p.modeVente === "FORFAIT") {
      for (const j of p.jalons.filter((x) => x.montant && x.date <= jour(-7))) {
        factures.push({ projetId: p.id, jalonId: j.id, type: "JALON", date: j.date, libelle: j.libelle, quantite: 1, unite: "forfait", pu: j.montant! });
      }
    } else if (p.modeVente === "REGIE") {
      // Une facture de régie par mois écoulé, selon les temps saisis
      const parMois = new Map<string, number>();
      for (const t of p.temps) if (t.jour < iso(new Date(auj.getFullYear(), auj.getMonth(), 1))) parMois.set(t.jour.slice(0, 7), (parMois.get(t.jour.slice(0, 7)) ?? 0) + t.heures);
      for (const [mois, h] of [...parMois.entries()].sort()) {
        const [y, mo] = mois.split("-").map(Number);
        const finMois = new Date(Date.UTC(y, mo, 0));
        factures.push({ projetId: p.id, type: "REGIE", date: new Date(finMois.getTime() + J), libelle: `Régie ${mois} — ${r2(h)} h`, quantite: r2(h / 7), unite: "jour", pu: p.tauxJournalier ?? 0, periodeDu: `${mois}-01`, periodeAu: iso(finMois) });
      }
    } else if (p.modeVente === "RECURRENT") {
      const d0 = new Date(Date.UTC(p.dateDebut.getUTCFullYear(), p.dateDebut.getUTCMonth(), 1));
      for (let d = d0; d < new Date(Date.UTC(auj.getUTCFullYear(), auj.getUTCMonth(), 1)); d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
        if (p.dateFin && d > p.dateFin) break;
        const finMois = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
        factures.push({ projetId: p.id, type: "MENSUELLE", date: finMois, libelle: `${p.nom} — ${d.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" })}`, quantite: 1, unite: "mois", pu: p.montantMensuel ?? 0, periodeDu: iso(d), periodeAu: iso(finMois) });
      }
    }
  }

  // Quelques devis en cours de négociation
  const p1 = projets.find((p) => p.nom.startsWith("Audit maintenance usine Lille"));
  if (p1) devis.push({ projetId: p1.id, supplementaire: true, objet: "Extension de l'audit à la ligne 3", client: p1.client, modele: p1.modele, statut: "ENVOYE", date: jour(-4), lignes: [{ libelle: "Audit ligne 3", type: "MO", quantite: 35, unite: "h", coutUnitaire: equipe.thomas.cout, prixUnitaire: 62, salarieId: equipe.thomas.id }, { libelle: "Pièces d'essai", type: "ACHAT", quantite: 1, unite: "forfait", coutUnitaire: 180, prixUnitaire: 260, salarieId: null }] });
  devis.push({ projetId: null, objet: "Rénovation de l'accueil", client: "Cabinet Martin", modele: "BTP", statut: "BROUILLON", date: jour(-1), acompte: 30, lignes: [{ libelle: "Main-d'œuvre", type: "MO", quantite: 35, unite: "h", coutUnitaire: equipe.thomas.cout, prixUnitaire: 38, salarieId: null }, { libelle: "Matériaux et fournitures", type: "ACHAT", quantite: 1, unite: "forfait", coutUnitaire: 1400, prixUnitaire: 2000, salarieId: null }] });
  devis.push({ projetId: null, objet: "Audit paie et conformité", client: "Pharmacie Centrale", modele: "CONSEIL", statut: "ENVOYE", date: jour(-9), acompte: 30, lignes: [{ libelle: "Consultant", type: "MO", quantite: 28, unite: "h", coutUnitaire: equipe.sophie.cout, prixUnitaire: 85, salarieId: equipe.sophie.id }] });
  devis.push({ projetId: null, objet: "Application de prise de rendez-vous", client: "Cabinet dentaire Leroy", modele: "INFORMATIQUE", statut: "ENVOYE", date: jour(-21), acompte: 30, lignes: [{ libelle: "Développement", type: "MO", quantite: 120, unite: "h", coutUnitaire: equipe.emma.cout, prixUnitaire: 65, salarieId: equipe.emma.id }, { libelle: "Gestion de projet", type: "MO", quantite: 16, unite: "h", coutUnitaire: equipe.lucas.cout, prixUnitaire: 80, salarieId: equipe.lucas.id }] });
  devis.push({ projetId: null, objet: "Ravalement de façade", client: "Copropriété Les Tilleuls", modele: "BTP", statut: "REFUSE", date: jour(-130), lignes: [{ libelle: "Main-d'œuvre", type: "MO", quantite: 160, unite: "h", coutUnitaire: equipe.thomas.cout, prixUnitaire: 36, salarieId: null }, { libelle: "Échafaudage", type: "SOUS_TRAITANCE", quantite: 1, unite: "forfait", coutUnitaire: 2600, prixUnitaire: 3300, salarieId: null }] });
  devis.push({ projetId: null, objet: "Séminaire de rentrée", client: "Assurances Moselle", modele: "EVENEMENT", statut: "REFUSE", date: jour(-75), lignes: [{ libelle: "Équipe sur place", type: "MO", quantite: 30, unite: "h", coutUnitaire: equipe.julie.cout, prixUnitaire: 45, salarieId: null }, { libelle: "Location salle", type: "SOUS_TRAITANCE", quantite: 1, unite: "forfait", coutUnitaire: 1800, prixUnitaire: 2300, salarieId: null }] });

  // Numérotation chronologique par année
  const compteurs = new Map<string, number>();
  const numero = (sorte: "D" | "F", d: Date) => { const k = `${sorte}-${d.getUTCFullYear()}`; const n = (compteurs.get(k) ?? 0) + 1; compteurs.set(k, n); return `${k}-${String(n).padStart(4, "0")}`; };

  devis.sort((a, b) => a.date.getTime() - b.date.getTime());
  await prisma.devisProjet.createMany({ data: devis.map((d) => {
    const totalHT = r2(d.lignes.reduce((t, l) => t + l.quantite * l.prixUnitaire, 0));
    const coutTotal = r2(d.lignes.reduce((t, l) => t + l.quantite * l.coutUnitaire, 0));
    return {
      entrepriseId, projetId: d.projetId, numero: numero("D", d.date), objet: d.objet, client: d.client, modele: d.modele, statut: d.statut, supplementaire: !!d.supplementaire,
      lignes: d.lignes, totalHT, coutTotal, acomptePct: d.acompte ?? null, createdAt: d.date,
      envoyeLe: d.statut === "BROUILLON" ? null : d.date, accepteLe: d.statut === "ACCEPTE" ? new Date(d.date.getTime() + 6 * J) : null,
      clientAdresse: d.client ? `${d.client}\n1 rue de la Démo\n57000 Metz` : null,
    };
  }) });

  factures.sort((a, b) => a.date.getTime() - b.date.getTime());
  const payees = new Set<string>();
  await prisma.factureProjet.createMany({ data: factures.map((f, i) => {
    const totalHT = r2(f.quantite * f.pu);
    const age = (auj.getTime() - f.date.getTime()) / J;
    // Payée après 15 à 35 jours ; les plus récentes restent à encaisser, deux restent en retard
    const statut = age > 40 && i % 11 !== 5 ? "PAYEE" : "EMISE";
    if (statut === "PAYEE" && f.jalonId) payees.add(f.jalonId);
    return {
      entrepriseId, projetId: f.projetId, jalonId: f.jalonId ?? null, numero: numero("F", f.date), type: f.type, date: f.date, echeance: new Date(f.date.getTime() + 30 * J),
      lignes: [{ libelle: f.libelle, quantite: f.quantite, unite: f.unite, prixUnitaire: f.pu }], totalHT, tauxTva: 20, totalTTC: r2(totalHT * 1.2),
      statut, payeeLe: statut === "PAYEE" ? new Date(f.date.getTime() + (15 + (i % 4) * 6) * J) : null, periodeDu: f.periodeDu ?? null, periodeAu: f.periodeAu ?? null,
    };
  }) });
  // Jalons facturés : « Payé » ou « Facturé »
  const factures_jalons = factures.filter((f) => f.jalonId).map((f) => f.jalonId!);
  await prisma.jalonProjet.updateMany({ where: { id: { in: [...payees] } }, data: { facturation: "PAYE" } });
  await prisma.jalonProjet.updateMany({ where: { id: { in: factures_jalons.filter((id) => !payees.has(id)) } }, data: { facturation: "FACTURE" } });
}
