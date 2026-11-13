import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accesProjets } from "@/lib/projets-serveur";
import { arrondi, heuresAffectation, heuresDatees, HEURES_JOUR, joursOuvres, jourISO, lundi, projetsAvecSynthese } from "@/lib/projets";

/**
 * GET ?annee=2026 : tableau de bord des projets.
 * - séries mensuelles : heures, coût réel (main-d'œuvre + frais), chiffre d'affaires reconnu, facturé, encaissé, marge et cumuls ;
 *   CA reconnu : régie = jours passés × taux journalier (dans la limite des jours vendus) ;
 *   forfait = prix × part du coût du mois dans le coût total projeté (méthode à l'avancement) ;
 * - plan de charge des 12 prochaines semaines (planifié / capacité de l'équipe) ;
 * - répartitions (heures par projet, CA par client), statuts, classements, étapes à venir.
 */
export async function GET(request: NextRequest) {
  const a = await accesProjets();
  if (!a.ok) return a.refus;
  const annee = Number(request.nextUrl.searchParams.get("annee")) || new Date().getFullYear();
  const debut = new Date(Date.UTC(annee, 0, 1)), fin = new Date(Date.UTC(annee, 11, 31, 23, 59, 59));
  const tous = await projetsAvecSynthese(a.entrepriseId);
  const projets = tous.filter((p) => p.statut !== "ANNULE" && p.dateDebut <= fin && (p.dateFin ?? new Date(8.64e15)) >= debut);
  const ids = projets.map((p) => p.id);
  const heures = await heuresDatees(ids);

  const mois = Array.from({ length: 12 }, () => ({ heures: 0, coutMO: 0, frais: 0, ca: 0, facture: 0, encaisse: 0 }));
  const idx = (d: Date | string) => { const x = typeof d === "string" ? new Date(d + "T12:00:00Z") : d; return x.getUTCFullYear() === annee ? x.getUTCMonth() : -1; };
  const parProjetHeures = new Map<string, number>();

  for (const p of projets) {
    const couts = new Map(p.synthese.parSalarie.map((l) => [l.salarieId, l.coutHoraire ?? 0]));
    const coutMois = Array(12).fill(0) as number[];
    let joursCumul = 0;
    for (const h of heures.filter((x) => x.projetId === p.id).sort((x, y) => x.jour.localeCompare(y.jour))) {
      const i = idx(h.jour);
      const cout = h.heures * (couts.get(h.salarieId) ?? 0);
      // Régie : CA = jours passés × TJ, plafonné aux jours vendus (y compris les jours des années précédentes)
      if (p.modeVente === "REGIE" && p.tauxJournalier) {
        const j = h.heures / HEURES_JOUR;
        const dispo = p.joursVendus ? Math.max(0, Math.min(j, p.joursVendus - joursCumul)) : j;
        joursCumul += j;
        if (i >= 0) mois[i].ca += dispo * p.tauxJournalier;
      }
      if (i < 0) continue;
      mois[i].heures += h.heures; mois[i].coutMO += cout; coutMois[i] += cout;
      parProjetHeures.set(p.id, (parProjetHeures.get(p.id) ?? 0) + h.heures);
    }
    for (const d of p.depenses) if (!d.prevu) { const i = idx(d.date); if (i >= 0) { mois[i].frais += d.montant; coutMois[i] += d.montant; } }
    for (const n of p.notesFrais) if (/valid|rembours|paie/i.test(n.statut)) { const i = idx(n.date); if (i >= 0) { mois[i].frais += n.montant; coutMois[i] += n.montant; } }
    if (p.modeVente === "FORFAIT" && p.synthese.vendu > 0) {
      const base = Math.max(p.synthese.projectionCout, p.synthese.coutReel, 1);
      coutMois.forEach((c, i) => { mois[i].ca += (p.synthese.vendu * c) / base; });
    }
    if (p.modeVente === "RECURRENT" && p.montantMensuel) {
      for (let m = 0; m < 12; m++) {
        const debutMois = new Date(Date.UTC(annee, m, 1)), finMois = new Date(Date.UTC(annee, m + 1, 0, 23, 59, 59));
        if (p.dateDebut <= finMois && (!p.dateFin || p.dateFin >= debutMois) && debutMois <= new Date()) mois[m].ca += p.montantMensuel;
      }
    }
    for (const f of p.factures) {
      if (f.statut === "ANNULEE") continue;
      const i = idx(f.date);
      if (i >= 0) mois[i].facture += f.totalHT;
      if (f.statut === "PAYEE") { const k = idx(f.payeeLe ?? f.date); if (k >= 0) mois[k].encaisse += f.totalHT; }
    }
    const avecFacture = new Set(p.factures.filter((f) => f.statut !== "ANNULEE").map((f) => f.jalonId));
    for (const j of p.jalons) {
      const i = idx(j.date);
      if (i < 0 || !j.montant || avecFacture.has(j.id)) continue;
      if (j.facturation === "FACTURE" || j.facturation === "PAYE") mois[i].facture += j.montant;
      if (j.facturation === "PAYE") mois[i].encaisse += j.montant;
    }
  }

  let cumCA = 0, cumCout = 0, cumFacture = 0, cumHeures = 0;
  const series = mois.map((m, i) => {
    const cout = m.coutMO + m.frais;
    cumCA += m.ca; cumCout += cout; cumFacture += m.facture; cumHeures += m.heures;
    return {
      mois: i + 1, heures: arrondi(m.heures, 1), coutMO: arrondi(m.coutMO), frais: arrondi(m.frais), cout: arrondi(cout), ca: arrondi(m.ca), marge: arrondi(m.ca - cout),
      facture: arrondi(m.facture), encaisse: arrondi(m.encaisse),
      cumulCA: arrondi(cumCA), cumulCout: arrondi(cumCout), cumulMarge: arrondi(cumCA - cumCout), cumulFacture: arrondi(cumFacture), cumulHeures: arrondi(cumHeures, 1),
    };
  });

  // Plan de charge des 12 prochaines semaines
  const salaries = await prisma.salarie.findMany({ where: { entrepriseId: a.entrepriseId, statut: "Actif" }, select: { id: true, heuresHebdomadaires: true } });
  const capaciteSemaine = salaries.reduce((t, s) => t + (s.heuresHebdomadaires || 35), 0);
  const l0 = lundi(new Date());
  const charge = Array.from({ length: 12 }, (_, k) => {
    const l = new Date(l0.getTime() + k * 7 * 86400000), v = new Date(l.getTime() + 4 * 86400000 + 86399000);
    const planifie = tous.filter((p) => p.statut === "PREVU" || p.statut === "EN_COURS").flatMap((p) => p.affectations).reduce((t, x) => t + heuresAffectation(x, l, v), 0);
    return { semaine: jourISO(l), planifie: arrondi(planifie, 1), capacite: capaciteSemaine, taux: capaciteSemaine ? Math.round((planifie / capaciteSemaine) * 100) : 0 };
  });

  // Occupation globale depuis le 1er janvier (heures sur projets facturés / capacité de l'équipe)
  const auj = new Date();
  const capaciteAnnee = salaries.reduce((t, s) => t + ((s.heuresHebdomadaires || 35) * joursOuvres(debut, auj < fin ? auj : fin)) / 5, 0);
  const heuresFacturables = heures.filter((h) => idx(h.jour) >= 0 && projets.find((p) => p.id === h.projetId)?.modeVente !== "INTERNE").reduce((t, h) => t + h.heures, 0);

  const tot = (f: (s: (typeof series)[number]) => number) => arrondi(series.reduce((t, s) => t + f(s), 0));
  const caAnnee = tot((s) => s.ca), coutAnnee = tot((s) => s.cout);
  const statuts: Record<string, number> = {};
  for (const p of tous) statuts[p.statut] = (statuts[p.statut] ?? 0) + 1;
  const clients = new Map<string, number>();
  for (const p of projets) if (p.modeVente !== "INTERNE") clients.set(p.client || "Sans client", (clients.get(p.client || "Sans client") ?? 0) + p.synthese.vendu);
  const dans30 = new Date(auj.getTime() + 30 * 86400000);
  // Pilotage du dirigeant : carnet de commandes (vendu restant à réaliser sur les projets prévus et en cours)
  const actifsTous = tous.filter((p) => p.statut === "PREVU" || p.statut === "EN_COURS");
  // Déjà réalisé : forfait au prorata des coûts engagés, régie en jours passés, récurrent en mois écoulés
  const realise = (p: (typeof tous)[number]) => {
    const sy = p.synthese;
    if (p.modeVente === "REGIE") return Math.min(sy.venduContrat, (sy.heuresReelles / HEURES_JOUR) * (p.tauxJournalier ?? 0));
    if (p.modeVente === "RECURRENT") return sy.vendu;
    return sy.projectionCout > 0 ? sy.venduContrat * Math.min(1, sy.coutReel / sy.projectionCout) : 0;
  };
  const carnet = arrondi(actifsTous.reduce((t, p) => t + Math.max(0, p.synthese.venduContrat - realise(p)), 0));

  const resume = projets.map((p) => ({ id: p.id, nom: p.nom, couleur: p.couleur, statut: p.statut, client: p.client, tauxMargeReelle: p.synthese.tauxMargeReelle, tauxProjection: p.synthese.tauxProjection, margeReelle: p.synthese.margeReelle, vendu: p.synthese.vendu, consommation: p.synthese.consommation, avancementTemps: p.synthese.avancementTemps, heures: arrondi(parProjetHeures.get(p.id) ?? 0, 1), alertes: p.synthese.alertes.filter((x) => x.niveau !== "info").length }));
  const c = a.voitCouts;
  return NextResponse.json({
    annee, voitCouts: c,
    kpi: {
      projetsActifs: statuts.EN_COURS ?? 0, projetsPrevus: statuts.PREVU ?? 0, projetsTermines: projets.filter((p) => p.statut === "TERMINE").length,
      heures: tot((s) => s.heures), occupation: capaciteAnnee > 0 ? arrondi((heuresFacturables / capaciteAnnee) * 100, 1) : null,
      enAlerte: resume.filter((p) => p.alertes > 0 && p.statut !== "TERMINE").length,
      ...(c ? {
        ca: caAnnee, cout: coutAnnee, marge: arrondi(caAnnee - coutAnnee), tauxMarge: caAnnee > 0 ? arrondi(((caAnnee - coutAnnee) / caAnnee) * 100, 1) : null,
        vendu: arrondi(projets.reduce((t, p) => t + p.synthese.vendu, 0)),
        margeProjetee: arrondi(projets.reduce((t, p) => t + p.synthese.projectionMarge, 0)),
        carnet,
      } : {}),
    },
    series: c ? series : series.map((s) => ({ mois: s.mois, heures: s.heures, cumulHeures: s.cumulHeures })),
    charge,
    heuresParProjet: resume.filter((p) => p.heures > 0).sort((x, y) => y.heures - x.heures).map((p) => ({ nom: p.nom, couleur: p.couleur, valeur: p.heures })),
    caParClient: c ? [...clients.entries()].map(([nom, valeur]) => ({ nom, valeur: arrondi(valeur) })).filter((x) => x.valeur > 0).sort((x, y) => y.valeur - x.valeur) : [],
    statuts,
    projets: c ? resume : resume.map((p) => ({ ...p, tauxMargeReelle: null, tauxProjection: null, margeReelle: 0, vendu: 0, consommation: null })),
    jalons: tous.flatMap((p) => p.jalons.map((j) => ({ ...j, montant: c ? j.montant : null, projetId: p.id, projet: p.nom, couleur: p.couleur })))
      .filter((j) => j.etat !== "FAIT" && j.date <= dans30)
      .sort((x, y) => x.date.getTime() - y.date.getTime()).slice(0, 15),
  });
}
