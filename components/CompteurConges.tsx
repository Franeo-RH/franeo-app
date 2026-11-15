"use client";

import { useEffect, useState } from "react";

type Acq = { du: string; au: string; heures: number; heuresReleves: number; moisReleves: number; joursMaladie: number; acquisTravail: number; acquisMaladie: number; acquis: number; primeVacances: boolean };
type Donnees =
  | { btp: false; soldeSaisi: number | null }
  | { btp: true; aPrendre: Acq; enCours: Acq; pris: number; enAttente: number; reste: number; priseDu: string; priseAu: string };

const d = (x: string) => new Date(x).toLocaleDateString("fr-FR", { timeZone: "UTC" });
const an = (x: string) => new Date(x).getUTCFullYear();

/** Compteur de congés BTP (caisse CIBTP). Ne s'affiche que pour les salariés d'une convention du BTP. */
export default function CompteurConges({ salarieId, espaceSalarie = false }: { salarieId?: string; espaceSalarie?: boolean }) {
  const [c, setC] = useState<Donnees | null>(null);
  useEffect(() => {
    fetch(espaceSalarie ? "/api/espace-salarie/conges" : `/api/salaries/${salarieId}/conges`).then((r) => (r.ok ? r.json() : null)).then(setC).catch(() => setC(null));
  }, [salarieId, espaceSalarie]);
  if (!c || !c.btp) return null;

  const tuile = (titre: string, valeur: string, detail: string, couleur = "#111827") => (
    <div style={{ background: "#f9fafb", borderRadius: 12, padding: "12px 14px" }}>
      <p style={{ margin: 0, fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{titre}</p>
      <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800, color: couleur }}>{valeur}</p>
      <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>{detail}</p>
    </div>
  );

  return (
    <div style={{ background: "#ffffff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🏗️ {espaceSalarie ? "Mes congés" : "Congés"} BTP</h2>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#c2410c", background: "#fff7ed", borderRadius: 999, padding: "3px 10px" }}>Payés par la caisse CIBTP</span>
      </div>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginTop: 12 }}>
        {tuile("Reste à prendre", `${c.reste} j`, `jusqu'au ${d(c.priseAu)}`, c.reste > 0 ? "#15803d" : "#111827")}
        {tuile(`Acquis ${an(c.aPrendre.du)}-${an(c.aPrendre.au)}`, `${c.aPrendre.acquis} j`, `${c.pris} j pris depuis le ${d(c.priseDu)}${c.enAttente ? ` · ${c.enAttente} j demandés` : ""}`)}
        {tuile("En cours d'acquisition", `${c.enCours.acquis} j`, `depuis le ${d(c.enCours.du)} · à prendre à partir du 1er mai ${an(c.enCours.au)}`)}
      </div>
      <p style={{ margin: "12px 0 0", fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
        2,5 jours ouvrables par tranche de 150 heures de travail (30 jours maximum), du 1er avril au 31 mars · heures retenues : {c.enCours.heures} h
        {c.enCours.moisReleves ? ` (dont ${c.enCours.heuresReleves} h des relevés validés)` : " (horaire du contrat, en attendant les relevés validés)"}
        {c.enCours.joursMaladie ? ` · arrêt maladie : +${c.enCours.acquisMaladie} j (2 j par mois, 24 j maximum)` : ""}.
        {" "}Congés pris décomptés en jours ouvrables (lundi au samedi, hors fériés).
        {c.aPrendre.primeVacances ? " ✅ Prime de vacances de la caisse (30 %) : 1 675 heures atteintes sur la dernière période." : ` Prime de vacances : 1 675 heures nécessaires sur la période (${c.aPrendre.heures} h sur la dernière).`}
        {!espaceSalarie && " Les heures sont à déclarer à la caisse de congés chaque mois ; l'indemnité n'apparaît pas sur le bulletin de l'entreprise."}
      </p>
    </div>
  );
}
