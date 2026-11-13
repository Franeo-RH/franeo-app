// lib/projets.ts
// Option « Projets, planning & rentabilité » (🚧 en cours de développement).
//
// Règles de calcul (estimations de pilotage, pas de la comptabilité) :
// - coût horaire chargé d'un salarié = coût standard saisi dans sa fiche,
//   sinon salaire mensuel × (1 + taux de charges) / (heures hebdo × 52 / 12) ;
// - heures prévues = heures/semaine de chaque affectation × jours ouvrés couverts / 5 ;
// - heures réelles = heures pointées avec le projet (de l'arrivée/reprise à la pause/départ suivante)
//   + temps saisis à la main ;
// - vendu = prix forfaitaire, ou taux journalier × jours vendus ; 0 pour un projet interne ;
// - frais réels = dépenses réelles + notes de frais validées rattachées au projet ;
// - projection = coût réel + reste du prévu (heures prévues après aujourd'hui) ;
// - alerte quand le coût réel dépasse le seuil du budget (80 % par défaut), puis 100 %.

import { prisma } from "@/lib/prisma";
import { TAUX_CHARGES_DEFAUT } from "@/lib/masse-salariale";

import { CATEGORIES_DEPENSE, COULEURS_PROJET, MODES_VENTE, STATUTS_PROJET } from "@/lib/projets-constantes";
export { CATEGORIES_DEPENSE, COULEURS_PROJET, MODES_VENTE, STATUTS_PROJET };

export const HEURES_JOUR = 7;
const MS_JOUR = 86400000;

export const arrondi = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
export const jourISO = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

/** Coût horaire chargé d'un salarié (null si on ne peut pas le calculer) */
export function coutHoraire(
  s: { coutHoraireStandard?: number | null; salaireMensuel?: number | null; heuresHebdomadaires?: number | null },
  tauxCharges: number | null | undefined,
): number | null {
  if (s.coutHoraireStandard && s.coutHoraireStandard > 0) return s.coutHoraireStandard;
  if (!s.salaireMensuel || s.salaireMensuel <= 0) return null;
  const heuresMois = ((s.heuresHebdomadaires && s.heuresHebdomadaires > 0 ? s.heuresHebdomadaires : 35) * 52) / 12;
  return arrondi((s.salaireMensuel * (1 + (tauxCharges ?? TAUX_CHARGES_DEFAUT) / 100)) / heuresMois);
}

/** Nombre de jours ouvrés (lun.–ven.) entre deux dates incluses */
export function joursOuvres(du: Date, au: Date): number {
  let n = 0;
  const d = new Date(Date.UTC(du.getUTCFullYear(), du.getUTCMonth(), du.getUTCDate()));
  const fin = Date.UTC(au.getUTCFullYear(), au.getUTCMonth(), au.getUTCDate());
  while (d.getTime() <= fin) {
    const j = d.getUTCDay();
    if (j !== 0 && j !== 6) n++;
    d.setTime(d.getTime() + MS_JOUR);
  }
  return n;
}

/** Heures prévues d'une affectation, éventuellement limitées à une fenêtre [du, au] */
export function heuresAffectation(a: { du: Date; au: Date; heuresSemaine: number }, du?: Date, au?: Date): number {
  const debut = du && du > a.du ? du : a.du;
  const fin = au && au < a.au ? au : a.au;
  if (fin < debut) return 0;
  return arrondi((a.heuresSemaine * joursOuvres(debut, fin)) / 5);
}

/** Lundi de la semaine d'une date (UTC, 00:00) */
export function lundi(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const j = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() - j + 1);
  return x;
}

/**
 * Heures pointées par projet et par salarié : chaque arrivée / reprise avec un projet
 * compte jusqu'à la pause ou au départ suivant du même jour.
 */
export function heuresPointees(pointages: { salarieId: string; jour: string; type: string; at: Date; projetId: string | null }[]) {
  const res = new Map<string, number>(); // clé projetId|salarieId
  const parJour = new Map<string, typeof pointages>();
  for (const p of pointages) {
    const k = `${p.salarieId}|${p.jour}`;
    if (!parJour.has(k)) parJour.set(k, []);
    parJour.get(k)!.push(p);
  }
  for (const liste of parJour.values()) {
    liste.sort((a, b) => a.at.getTime() - b.at.getTime());
    let debut: { at: Date; projetId: string | null } | null = null;
    for (const p of liste) {
      if (p.type === "ARRIVEE" || p.type === "REPRISE") debut = { at: p.at, projetId: p.projetId };
      else if (debut) {
        if (debut.projetId) {
          const k = `${debut.projetId}|${p.salarieId}`;
          res.set(k, (res.get(k) ?? 0) + (p.at.getTime() - debut.at.getTime()) / 3600000);
        }
        debut = null;
      }
    }
  }
  return res;
}

/** Même calcul, mais détaillé par jour : [{ projetId, salarieId, jour, heures }] */
export function heuresPointeesParJour(pointages: { salarieId: string; jour: string; type: string; at: Date; projetId: string | null }[]) {
  const res = new Map<string, number>(); // clé projetId|salarieId|jour
  const tri = [...pointages].sort((a, b) => a.salarieId.localeCompare(b.salarieId) || a.jour.localeCompare(b.jour) || a.at.getTime() - b.at.getTime());
  let debut: { at: Date; projetId: string | null; cle: string } | null = null;
  for (const p of tri) {
    const cleJour = `${p.salarieId}|${p.jour}`;
    if (debut && debut.cle !== cleJour) debut = null;
    if (p.type === "ARRIVEE" || p.type === "REPRISE") debut = { at: p.at, projetId: p.projetId, cle: cleJour };
    else if (debut) {
      if (debut.projetId) {
        const k = `${debut.projetId}|${p.salarieId}|${p.jour}`;
        res.set(k, (res.get(k) ?? 0) + (p.at.getTime() - debut.at.getTime()) / 3600000);
      }
      debut = null;
    }
  }
  return [...res.entries()].map(([k, heures]) => { const [projetId, salarieId, jour] = k.split("|"); return { projetId, salarieId, jour, heures: arrondi(heures) }; });
}

/** Toutes les heures datées (pointées + saisies) des projets donnés */
export async function heuresDatees(projetIds: string[]) {
  if (!projetIds.length) return [];
  const avecProjet = await prisma.pointage.findMany({ where: { projetId: { in: projetIds } }, select: { salarieId: true, jour: true } });
  const cles = [...new Set(avecProjet.map((x) => `${x.salarieId}|${x.jour}`))];
  const [pointages, temps] = await Promise.all([
    cles.length ? prisma.pointage.findMany({ where: { OR: cles.map((c) => { const [salarieId, jour] = c.split("|"); return { salarieId, jour }; }) }, select: { salarieId: true, jour: true, type: true, at: true, projetId: true } }) : Promise.resolve([]),
    prisma.tempsProjet.findMany({ where: { projetId: { in: projetIds } }, select: { projetId: true, salarieId: true, jour: true, heures: true, commentaire: true } }),
  ]);
  return [
    ...heuresPointeesParJour(pointages).filter((x) => projetIds.includes(x.projetId)).map((x) => ({ ...x, source: "Badge" as const, commentaire: null as string | null })),
    ...temps.map((t) => ({ ...t, source: "Saisie" as const })),
  ];
}

export type LigneSalarieProjet = {
  salarieId: string; salarie: string; coutHoraire: number | null;
  heuresPrevues: number; heuresReelles: number; coutPrevu: number; coutReel: number;
};

export type Synthese = {
  vendu: number; venduContrat: number;
  heuresPrevues: number; heuresReelles: number; heuresRestantes: number;
  budgetMO: number; budgetFrais: number; budgetTotal: number; margePrevue: number; tauxMargePrevue: number | null;
  coutMO: number; fraisReels: number; coutReel: number; margeReelle: number; tauxMargeReelle: number | null;
  consommation: number | null; // % du budget total déjà consommé
  avancementTemps: number | null; // % du calendrier écoulé
  projectionCout: number; projectionMarge: number; tauxProjection: number | null;
  sansCout: string[]; // salariés sans salaire ni coût standard
  facture: number; paye: number; aFacturer: number; resteAFacturer: number; // échéancier de facturation (jalons)
  jalonsFaits: number; jalonsTotal: number; jalonsEnRetard: number;
  alertes: { niveau: "info" | "attention" | "danger"; texte: string }[];
  parSalarie: LigneSalarieProjet[];
};

type ProjetCalcul = {
  id: string; nom: string; statut: string; dateDebut: Date; dateFin: Date | null;
  modeVente: string; prixVente: number | null; tauxJournalier: number | null; joursVendus: number | null;
  budgetHeures: number | null; seuilAlerte: number;
  affectations: { salarieId: string; du: Date; au: Date; heuresSemaine: number; salarie: SalarieCout }[];
  depenses: { montant: number; prevu: boolean }[];
  temps: { salarieId: string; heures: number; salarie: SalarieCout }[];
  notesFrais: { montant: number; statut: string }[];
  jalons?: { id?: string; libelle: string; date: Date; etat: string; montant: number | null; facturation: string }[];
  montantMensuel?: number | null;
  factures?: { jalonId: string | null; totalHT: number; statut: string; echeance: Date; numero: string }[];
};
type SalarieCout = { id: string; prenom: string; nom: string; coutHoraireStandard: number | null; salaireMensuel: number | null; heuresHebdomadaires: number | null };

/** Nombre de mois (entamés) entre deux dates */
export function moisEntre(du: Date, au: Date): number {
  if (au < du) return 0;
  return (au.getUTCFullYear() - du.getUTCFullYear()) * 12 + au.getUTCMonth() - du.getUTCMonth() + 1;
}

type Vente = { modeVente: string; prixVente: number | null; tauxJournalier: number | null; joursVendus: number | null; montantMensuel?: number | null; dateDebut?: Date; dateFin?: Date | null };

/**
 * Montant vendu. Contrat récurrent : « à date » = mois écoulés × montant mensuel ;
 * « contrat » = durée totale (12 mois si pas de date de fin).
 */
export const prixVendu = (p: Vente, quand: "contrat" | "a-date" = "contrat", maintenant = new Date()) => {
  if (p.modeVente === "INTERNE") return 0;
  if (p.modeVente === "REGIE") return (p.tauxJournalier ?? 0) * (p.joursVendus ?? 0);
  if (p.modeVente === "RECURRENT") {
    const debut = p.dateDebut ?? maintenant;
    const fin = p.dateFin ?? new Date(Date.UTC(debut.getUTCFullYear() + 1, debut.getUTCMonth(), debut.getUTCDate() - 1));
    const n = quand === "contrat" ? moisEntre(debut, fin) : moisEntre(debut, maintenant < fin ? maintenant : fin);
    return (p.montantMensuel ?? 0) * n;
  }
  return p.prixVente ?? 0;
};

/** Synthèse budget / réel / projection d'un projet */
export function synthese(p: ProjetCalcul, tauxCharges: number | null | undefined, heuresPointeesProjet: Map<string, number>, salariesPointes: Map<string, SalarieCout>, maintenant = new Date()): Synthese {
  const lignes = new Map<string, LigneSalarieProjet>();
  const ligne = (s: SalarieCout) => {
    if (!lignes.has(s.id)) lignes.set(s.id, { salarieId: s.id, salarie: `${s.prenom} ${s.nom}`, coutHoraire: coutHoraire(s, tauxCharges), heuresPrevues: 0, heuresReelles: 0, coutPrevu: 0, coutReel: 0 });
    return lignes.get(s.id)!;
  };
  const aujourdhui = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate()));
  const demain = new Date(aujourdhui.getTime() + MS_JOUR);
  let restePrevu = 0, resteHeures = 0;
  for (const a of p.affectations) {
    const l = ligne(a.salarie);
    const h = heuresAffectation(a);
    l.heuresPrevues += h;
    l.coutPrevu += h * (l.coutHoraire ?? 0);
    const reste = heuresAffectation(a, demain);
    resteHeures += reste;
    restePrevu += reste * (l.coutHoraire ?? 0);
  }
  for (const t of p.temps) ligne(t.salarie).heuresReelles += t.heures;
  for (const [k, h] of heuresPointeesProjet) {
    const [projetId, salarieId] = k.split("|");
    if (projetId !== p.id) continue;
    const s = salariesPointes.get(salarieId);
    if (s) ligne(s).heuresReelles += h;
  }
  for (const l of lignes.values()) {
    l.heuresPrevues = arrondi(l.heuresPrevues); l.heuresReelles = arrondi(l.heuresReelles);
    l.coutPrevu = arrondi(l.coutPrevu); l.coutReel = arrondi(l.heuresReelles * (l.coutHoraire ?? 0));
  }
  const parSalarie = [...lignes.values()].sort((a, b) => b.heuresReelles + b.heuresPrevues - (a.heuresReelles + a.heuresPrevues));
  const somme = (f: (l: LigneSalarieProjet) => number) => arrondi(parSalarie.reduce((t, l) => t + f(l), 0));

  const vendu = arrondi(prixVendu(p, "a-date", maintenant));
  const venduContrat = arrondi(prixVendu(p, "contrat", maintenant));
  const heuresPrevues = somme((l) => l.heuresPrevues);
  const heuresReelles = somme((l) => l.heuresReelles);
  const budgetMO = somme((l) => l.coutPrevu);
  const budgetFrais = arrondi(p.depenses.filter((d) => d.prevu).reduce((t, d) => t + d.montant, 0));
  const budgetTotal = arrondi(budgetMO + budgetFrais);
  const coutMO = somme((l) => l.coutReel);
  const fraisReels = arrondi(p.depenses.filter((d) => !d.prevu).reduce((t, d) => t + d.montant, 0) + p.notesFrais.filter((n) => /valid|rembours|paie/i.test(n.statut)).reduce((t, n) => t + n.montant, 0));
  const coutReel = arrondi(coutMO + fraisReels);
  const fraisRestants = Math.max(0, budgetFrais - fraisReels);
  const projectionCout = arrondi(p.statut === "TERMINE" || p.statut === "ANNULE" ? coutReel : coutReel + restePrevu + fraisRestants);
  const taux = (marge: number, base = vendu) => (base > 0 ? arrondi((marge / base) * 100, 1) : null);

  let avancementTemps: number | null = null;
  if (p.dateFin && p.dateFin > p.dateDebut) avancementTemps = arrondi(Math.min(100, Math.max(0, ((maintenant.getTime() - p.dateDebut.getTime()) / (p.dateFin.getTime() - p.dateDebut.getTime())) * 100)), 0);
  const consommation = budgetTotal > 0 ? arrondi((coutReel / budgetTotal) * 100, 0) : null;

  const alertes: Synthese["alertes"] = [];
  const sansCout = parSalarie.filter((l) => l.coutHoraire == null).map((l) => l.salarie);
  if (consommation != null && consommation >= 100) alertes.push({ niveau: "danger", texte: `Budget dépassé : ${consommation} % consommé.` });
  else if (consommation != null && consommation >= p.seuilAlerte) alertes.push({ niveau: "attention", texte: `${consommation} % du budget consommé (seuil d'alerte ${p.seuilAlerte} %).` });
  if (consommation != null && avancementTemps != null && avancementTemps > 10 && consommation > avancementTemps + 15) alertes.push({ niveau: "attention", texte: `Le budget se consomme plus vite que le calendrier (${consommation} % du budget pour ${avancementTemps} % du temps).` });
  if (venduContrat > 0 && projectionCout > venduContrat) alertes.push({ niveau: "danger", texte: "Au rythme prévu, le projet finira à perte." });
  if (p.budgetHeures && heuresReelles > p.budgetHeures) alertes.push({ niveau: "danger", texte: `Enveloppe d'heures dépassée (${heuresReelles} h pour ${p.budgetHeures} h).` });
  if (p.modeVente === "REGIE" && p.joursVendus && heuresReelles / HEURES_JOUR > p.joursVendus) alertes.push({ niveau: "attention", texte: `Plus de jours passés (${arrondi(heuresReelles / HEURES_JOUR, 1)}) que de jours vendus (${p.joursVendus}) : pensez à facturer le complément.` });
  if (p.statut === "EN_COURS" && p.dateFin && p.dateFin < aujourdhui) alertes.push({ niveau: "attention", texte: "La date de fin est passée mais le projet est toujours en cours." });
  if (sansCout.length) alertes.push({ niveau: "info", texte: `Coût horaire inconnu pour ${sansCout.join(", ")} : renseignez le salaire ou un coût standard dans la fiche.` });
  const jalons = p.jalons ?? [];
  const sommeJ = (f: (j: (typeof jalons)[number]) => boolean) => arrondi(jalons.filter(f).reduce((t, j) => t + (j.montant ?? 0), 0));
  // Facturé : factures émises depuis le projet + jalons marqués facturés à la main (sans facture liée)
  const factures = (p.factures ?? []).filter((f) => f.statut !== "ANNULEE");
  const jalonsFactures = new Set(factures.map((f) => f.jalonId).filter(Boolean));
  const jalonsManuels = (j: (typeof jalons)[number]) => !j.id || !jalonsFactures.has(j.id);
  const facture = arrondi(factures.reduce((t, f) => t + f.totalHT, 0) + sommeJ((j) => jalonsManuels(j) && (j.facturation === "FACTURE" || j.facturation === "PAYE")));
  const paye = arrondi(factures.filter((f) => f.statut === "PAYEE").reduce((t, f) => t + f.totalHT, 0) + sommeJ((j) => jalonsManuels(j) && j.facturation === "PAYE"));
  const aFacturer = sommeJ((j) => j.facturation === "A_FACTURER");
  const impayees = factures.filter((f) => f.statut === "EMISE" && f.echeance < aujourdhui);
  if (impayees.length) alertes.push({ niveau: "danger", texte: `Facture(s) en retard de paiement : ${impayees.map((f) => `${f.numero} (${f.totalHT.toLocaleString("fr-FR")} € HT)`).join(", ")}.` });
  const enRetard = jalons.filter((j) => j.etat !== "FAIT" && j.date < aujourdhui);
  const aFacturerEchus = jalons.filter((j) => j.facturation === "A_FACTURER" && (j.etat === "FAIT" || j.date < aujourdhui));
  if (enRetard.length) alertes.push({ niveau: "attention", texte: `Jalon(s) en retard : ${enRetard.map((j) => j.libelle).join(", ")}.` });
  if (aFacturerEchus.length) alertes.push({ niveau: "attention", texte: `À facturer maintenant : ${aFacturerEchus.map((j) => `${j.libelle}${j.montant ? ` (${j.montant.toLocaleString("fr-FR")} €)` : ""}`).join(", ")}.` });
  if (facture - paye > 0 && !impayees.length) alertes.push({ niveau: "info", texte: `${(facture - paye).toLocaleString("fr-FR")} € facturés en attente de paiement.` });
  if (!p.affectations.length && p.statut !== "TERMINE" && p.statut !== "ANNULE") alertes.push({ niveau: "info", texte: "Aucun salarié planifié sur ce projet." });

  return {
    vendu, heuresPrevues, heuresReelles, heuresRestantes: arrondi(resteHeures),
    venduContrat,
    budgetMO, budgetFrais, budgetTotal, margePrevue: arrondi(venduContrat - budgetTotal), tauxMargePrevue: taux(venduContrat - budgetTotal, venduContrat),
    coutMO, fraisReels, coutReel, margeReelle: arrondi(vendu - coutReel), tauxMargeReelle: taux(vendu - coutReel),
    consommation, avancementTemps,
    projectionCout, projectionMarge: arrondi(venduContrat - projectionCout), tauxProjection: taux(venduContrat - projectionCout, venduContrat),
    sansCout, alertes, parSalarie,
    facture, paye, aFacturer, resteAFacturer: arrondi(Math.max(0, (p.modeVente === "RECURRENT" ? vendu : venduContrat) - facture)),
    jalonsFaits: jalons.filter((j) => j.etat === "FAIT").length, jalonsTotal: jalons.length, jalonsEnRetard: enRetard.length,
  };
}

const SELECT_COUT = { id: true, prenom: true, nom: true, coutHoraireStandard: true, salaireMensuel: true, heuresHebdomadaires: true } as const;

/** Projets d'une entreprise avec leur synthèse (un seul passage en base pour les pointages) */
export async function projetsAvecSynthese(entrepriseId: string, where: { id?: string; statut?: { in: string[] } } = {}) {
  const [entreprise, projets] = await Promise.all([
    prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { tauxCharges: true } }),
    prisma.projet.findMany({
      where: { entrepriseId, ...where },
      orderBy: [{ statut: "asc" }, { dateDebut: "desc" }],
      include: {
        responsable: { select: { id: true, prenom: true, nom: true } },
        affectations: { include: { salarie: { select: SELECT_COUT } }, orderBy: { du: "asc" } },
        depenses: { orderBy: { date: "desc" } },
        temps: { include: { salarie: { select: SELECT_COUT } }, orderBy: { jour: "desc" } },
        notesFrais: { select: { id: true, montant: true, statut: true, motif: true, date: true, salarie: { select: { prenom: true, nom: true } } } },
        jalons: { orderBy: { date: "asc" } },
        factures: { orderBy: { date: "desc" }, select: { id: true, numero: true, type: true, date: true, echeance: true, totalHT: true, totalTTC: true, tauxTva: true, statut: true, jalonId: true, payeeLe: true, relances: true, periodeDu: true, periodeAu: true } },
        devis: { orderBy: { createdAt: "desc" }, select: { id: true, numero: true, objet: true, statut: true, totalHT: true, supplementaire: true, createdAt: true } },
      },
    }),
  ]);
  const ids = projets.map((p) => p.id);
  // Toutes les journées où un pointage porte un de ces projets, pour retrouver les fins de plage
  const avecProjet = ids.length ? await prisma.pointage.findMany({ where: { projetId: { in: ids } }, select: { salarieId: true, jour: true } }) : [];
  const cles = [...new Set(avecProjet.map((x) => `${x.salarieId}|${x.jour}`))];
  const pointages = cles.length
    ? await prisma.pointage.findMany({
        where: { OR: cles.map((c) => { const [salarieId, jour] = c.split("|"); return { salarieId, jour }; }) },
        select: { salarieId: true, jour: true, type: true, at: true, projetId: true },
      })
    : [];
  const hp = heuresPointees(pointages);
  const salariesPointes = new Map(
    (await prisma.salarie.findMany({ where: { id: { in: [...new Set(avecProjet.map((x) => x.salarieId))] } }, select: SELECT_COUT })).map((s) => [s.id, s]),
  );
  return projets.map((p) => ({ ...p, synthese: synthese(p, entreprise?.tauxCharges, hp, salariesPointes) }));
}

/** Retire les montants pour un utilisateur sans le droit « projets.couts » */
export function masquerCouts<T extends { synthese: Synthese; prixVente?: number | null; tauxJournalier?: number | null }>(p: T) {
  const s = p.synthese;
  return {
    ...p, prixVente: null, tauxJournalier: null,
    depenses: [], notesFrais: [], factures: [], devis: [], montantMensuel: null,
    ...("jalons" in p ? { jalons: (p as unknown as { jalons: Record<string, unknown>[] }).jalons.map((j) => ({ ...j, montant: null })) } : {}),
    synthese: {
      ...s, vendu: 0, venduContrat: 0, budgetMO: 0, budgetFrais: 0, budgetTotal: 0, margePrevue: 0, tauxMargePrevue: null, coutMO: 0, fraisReels: 0, coutReel: 0,
      margeReelle: 0, tauxMargeReelle: null, projectionCout: 0, projectionMarge: 0, tauxProjection: null, consommation: null,
      facture: 0, paye: 0, aFacturer: 0, resteAFacturer: 0,
      alertes: s.alertes.filter((a) => !/budget|perte|coût|factur|paiement/i.test(a.texte)),
      parSalarie: s.parSalarie.map((l) => ({ ...l, coutHoraire: null, coutPrevu: 0, coutReel: 0 })),
    },
  };
}

/** Projets qu'un salarié peut choisir au pointage : ceux où il est planifié aujourd'hui, sinon tous les projets en cours */
export async function projetsPourPointage(entrepriseId: string, salarieId: string) {
  const auj = new Date();
  const debutJour = new Date(Date.UTC(auj.getUTCFullYear(), auj.getUTCMonth(), auj.getUTCDate()));
  const actifs = await prisma.projet.findMany({
    where: { entrepriseId, statut: { in: ["EN_COURS", "PREVU"] } },
    select: { id: true, nom: true, code: true, couleur: true, statut: true, affectations: { where: { salarieId, du: { lte: auj }, au: { gte: debutJour } }, select: { id: true } } },
    orderBy: { nom: "asc" },
  });
  const planifies = actifs.filter((p) => p.affectations.length);
  const liste = planifies.length ? planifies : actifs.filter((p) => p.statut === "EN_COURS");
  return { projets: liste.map(({ id, nom, code, couleur }) => ({ id, nom, code, couleur })), planifie: planifies.length > 0 };
}
