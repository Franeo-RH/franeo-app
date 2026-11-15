"use client";

import { useEffect, useState } from "react";

type Acq = { du: string; au: string; heures: number; heuresReleves: number; moisReleves: number; joursMaladie: number; acquisTravail: number; acquisMaladie: number; acquis: number; primeVacances: boolean };
type Donnees = {
  regle: { code: "BTP" | "DROIT_COMMUN"; libelle: string; caisse: boolean };
  aPrendre: Acq; enCours: Acq; pris: number; enAttente: number; reste: number; priseDu: string; priseAu: string;
  reprise: { date: string; reste: number; enCours: number; utilisee: boolean } | null;
};

const d = (x: string) => new Date(x).toLocaleDateString("fr-FR", { timeZone: "UTC" });
const moisAn = (x: string) => new Date(x).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

/** Solde de congés d'un salarié (fiche salarié, espace salarié) */
export default function CompteurConges({ salarieId, espaceSalarie = false, lienReprise = "/client/salaries/conges" }: { salarieId?: string; espaceSalarie?: boolean; lienReprise?: string }) {
  const [c, setC] = useState<Donnees | null>(null);
  useEffect(() => {
    fetch(espaceSalarie ? "/api/espace-salarie/conges" : `/api/salaries/${salarieId}/conges`).then((r) => (r.ok ? r.json() : null)).then(setC).catch(() => setC(null));
  }, [salarieId, espaceSalarie]);
  if (!c?.regle) return null;
  const btp = c.regle.code === "BTP";
  // Les jours en cours d'acquisition se prennent à partir du 1er mai (BTP) ou du 1er juin (droit commun) suivant
  const fin = new Date(c.enCours.au);
  const dispo = new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth() + (btp ? 2 : 1), 1)).toISOString();

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
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🏖️ {espaceSalarie ? "Mes congés payés" : "Congés payés"}</h2>
        <span style={{ fontSize: 12, fontWeight: 700, color: btp ? "#c2410c" : "#1d4ed8", background: btp ? "#fff7ed" : "#eff6ff", borderRadius: 999, padding: "3px 10px" }}>
          {btp ? "🏗️ BTP · payés par la caisse CIBTP" : "Code du travail"}
        </span>
      </div>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginTop: 12 }}>
        {tuile("Reste à prendre", `${c.reste} j`, `${c.pris} j pris${c.enAttente ? ` · ${c.enAttente} j demandés` : ""}`, c.reste > 0 ? "#15803d" : "#111827")}
        {tuile("En cours d'acquisition", `${c.enCours.acquis} j`, `depuis ${moisAn(c.enCours.du)}, à prendre à partir de ${moisAn(dispo)}`)}
      </div>
      <p style={{ margin: "12px 0 0", fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
        {btp
          ? `2,5 jours ouvrables par tranche de 150 heures de travail, du 1er avril au 31 mars (30 jours maximum).${c.aPrendre.primeVacances ? " ✅ Prime de vacances de la caisse : 1 675 heures atteintes." : ""}`
          : "2,5 jours ouvrables par mois travaillé, du 1er juin au 31 mai (30 jours maximum)."}
        {" "}Congés décomptés en jours ouvrables (lundi au samedi, hors fériés).
        {c.enCours.joursMaladie ? ` Arrêt maladie : 2 jours par mois d'arrêt (24 jours maximum).` : ""}
        {btp && !espaceSalarie && " Heures à déclarer chaque mois à la caisse : l'indemnité n'apparaît pas sur le bulletin de l'entreprise."}
      </p>
      {c.reprise && (
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#374151" }}>
          📌 Solde de départ au {d(c.reprise.date)} : {c.reprise.reste} j à prendre, {c.reprise.enCours} j en cours.
          {!espaceSalarie && <> <a href={lienReprise} style={{ color: "#ea580c", fontWeight: 600 }}>Mettre à jour →</a></>}
        </p>
      )}
    </div>
  );
}
