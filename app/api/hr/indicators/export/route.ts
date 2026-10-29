import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { lireFiltres } from "@/lib/indicateurs-acces";
import { calculerIndicateurs, lignesDetail, paginer, VUES, type Vue } from "@/lib/indicateurs-rh";

export const dynamic = "force-dynamic";

/** GET ?format=xlsx|csv&view=… + mêmes filtres que /api/hr/indicators : export qui respecte les filtres actifs */
export async function GET(request: NextRequest) {
  const r = await lireFiltres(request);
  if ("erreur" in r) return r.erreur;
  const p = request.nextUrl.searchParams;
  const format = p.get("format") === "csv" ? "csv" : "xlsx";
  const vue = (p.get("view") && p.get("view")! in VUES ? p.get("view") : "effectif") as Vue;

  const [ind, det] = await Promise.all([calculerIndicateurs(r.filtres), lignesDetail(r.filtres, vue)]);
  const lignes = paginer(det.lignes, { q: p.get("q"), tri: p.get("sort"), sens: p.get("dir"), colonne: p.get("col"), valeur: p.get("val"), parPage: 200 }).toutes;
  const cols = det.colonnes.filter((c) => c.label);
  const detail = lignes.map((l) => Object.fromEntries(cols.map((c) => [c.label, l[c.cle] ?? ""])));
  const debut = new Date(ind.periode.debut).toLocaleDateString("fr-FR");
  const fin = new Date(ind.periode.fin).toLocaleDateString("fr-FR");
  const v = (x: number | null) => (x === null ? "non renseigné" : x);
  const kpi = [
    ["Période", `${debut} → ${fin}`],
    ["Effectif total", ind.workforce.total], ["CDI", ind.workforce.cdi], ["CDD", ind.workforce.cdd], ["Alternants", ind.workforce.alternants], ["Stagiaires", ind.workforce.stagiaires],
    ["Ancienneté moyenne (ans)", ind.workforce.ancienneteMoyenne],
    ["Entrées", ind.movements.entrees], ["Sorties", ind.movements.sorties],
    ["Taux d'absentéisme (%)", v(ind.absences.tauxAbsenteisme)], ["Jours d'absence", ind.absences.joursTotal],
    ...ind.absences.parMotif.map((m) => [`Absences — ${m.motif} (jours)`, m.jours]),
    ["Solde total de congés (j)", v(ind.leaveBalances.soldeTotal)], ["Demandes de congés en attente", ind.leaveBalances.demandesEnAttente], ["Jours de congés planifiés à venir", ind.leaveBalances.joursPlanifies],
    ["Heures supplémentaires", ind.overtime.heuresTotal], ["Salariés avec heures supp", ind.overtime.salaries], ["Jours de télétravail", ind.overtime.joursTeletravail],
    ["Primes versées (€)", ind.bonuses.total], ["Prime moyenne par salarié (€)", ind.bonuses.moyenneParSalarie], ["Budget primes (€)", v(ind.bonuses.budget)], ["Consommation budget primes (%)", v(ind.bonuses.tauxConsommation)],
    ["Entretiens prévus", ind.interviews.prevus], ["Entretiens réalisés", ind.interviews.realises], ["Entretiens réalisés (%)", v(ind.interviews.pourcentage)],
    ["Heures de formation", ind.trainings.heures], ["Coût formation (€)", ind.trainings.cout], ["Budget formation (€)", v(ind.trainings.budget)], ["Consommation budget formation (%)", v(ind.trainings.tauxConsommation)],
  ];
  const date = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const cell = (x: unknown) => { const t = String(x ?? "").replace(".", ","); return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    const txt = "﻿" + [cols.map((c) => c.label), ...lignes.map((l) => cols.map((c) => l[c.cle] ?? ""))].map((r2) => r2.map(cell).join(";")).join("\r\n");
    return new NextResponse(txt, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="indicateurs-rh-${vue}-${date}.csv"` } });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Indicateur", "Valeur"], ...kpi]), "Indicateurs");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ind.series.points.map((s) => ({ [ind.series.granularite === "mois" ? "Mois" : ind.series.granularite === "semaine" ? "Semaine du" : "Jour"]: s.label, Effectif: s.effectif, "Jours d'absence": s.absences, Entrées: s.entrees, Sorties: s.sorties, "Jours de télétravail": s.teletravail }))), "Évolution");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ind.mensuel.map((s) => ({ Mois: s.label, "Primes (€)": s.primes, "Heures supp": s.heuresSupp, "Dans la période": s.dansPeriode ? "oui" : "" }))), "Primes et HS par mois");
  const R = ind.repartitions;
  const reps = [
    ...R.contrats.map((x) => ({ Répartition: "Contrats", Libellé: x.label, Valeur: x.valeur })),
    ...R.effectifParService.map((x) => ({ Répartition: "Effectif par service", Libellé: x.label, Valeur: x.valeur })),
    ...R.effectifParEtablissement.map((x) => ({ Répartition: "Effectif par établissement", Libellé: x.label, Valeur: x.valeur })),
    ...R.absencesParService.map((x) => ({ Répartition: "Jours d'absence par service", Libellé: x.label, Valeur: x.valeur })),
    ...R.heuresSuppParSalarie.map((x) => ({ Répartition: "Heures supp par salarié", Libellé: x.label, Valeur: x.valeur })),
    ...R.primesParService.map((x) => ({ Répartition: "Primes par service (€)", Libellé: x.label, Valeur: x.valeur })),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reps.length ? reps : [{ Information: "Aucune donnée" }]), "Répartitions");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail.length ? detail : [{ Information: "Aucune donnée" }]), VUES[vue].slice(0, 31));
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="indicateurs-rh-${date}.xlsx"` } });
}
