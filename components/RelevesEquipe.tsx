"use client";

import { useEffect, useState } from "react";
import CalendrierReleve from "@/components/CalendrierReleve";
import { fmtH, NOMS_MOIS, STATUTS_RELEVE, type AbsenceReleve, type JourReleve } from "@/lib/heures";

type R = { salarie: { id: string; prenom: string; nom: string }; premier: string; statut: string; commentaire: string | null; jours: JourReleve[]; absences: AbsenceReleve[] };

/** Manager / dirigeant : les relevés mensuels (RMA) de toute l'équipe, mois par mois, avec le calendrier */
export default function RelevesEquipe() {
  const now = new Date();
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());
  const [liste, setListe] = useState<R[] | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  useEffect(() => {
    setListe(null);
    fetch(`/api/espace-salarie/releves-equipe?mois=${mois}&annee=${annee}`).then((r) => (r.ok ? r.json() : [])).then((d) => setListe(Array.isArray(d) ? d : [])).catch(() => setListe([]));
  }, [mois, annee]);
  const decaler = (n: number) => { const d = new Date(annee, mois - 1 + n, 1); setMois(d.getMonth() + 1); setAnnee(d.getFullYear()); };
  const btn: React.CSSProperties = { border: "1px solid #d1d5db", background: "#ffffff", borderRadius: "8px", padding: "6px 12px", cursor: "pointer" };
  return (
    <section style={{ background: "#ffffff", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", padding: "18px" }}>
      <h2 style={{ margin: "0 0 10px", fontSize: "18px" }}>⏱️ Relevés de mon équipe</h2>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
        <button type="button" style={btn} onClick={() => decaler(-1)} aria-label="Mois précédent">◀</button>
        <strong>{NOMS_MOIS[mois - 1]} {annee}</strong>
        <button type="button" style={btn} onClick={() => decaler(1)} aria-label="Mois suivant">▶</button>
      </div>
      {liste === null ? <p style={{ color: "#6b7280", fontSize: "14px" }}>Chargement…</p> : liste.length === 0 ? <p style={{ color: "#6b7280", fontSize: "14px" }}>Aucun salarié dans votre équipe.</p> : liste.map((r) => {
        const h = r.jours.reduce((a, j) => a + (j.heures || 0), 0), hs = r.jours.reduce((a, j) => a + j.heuresSupp, 0);
        const st = STATUTS_RELEVE[r.statut] || STATUTS_RELEVE.Brouillon;
        const jours: Record<string, JourReleve> = Object.fromEntries(r.jours.map((j) => [j.date, j]));
        return (
          <div key={r.salarie.id} style={{ borderTop: "1px solid #f3f4f6", padding: "10px 0" }}>
            <button type="button" onClick={() => setOuvert(ouvert === r.salarie.id ? null : r.salarie.id)} style={{ width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", textAlign: "left", color: "inherit" }}>
              <span><strong>{r.salarie.prenom} {r.salarie.nom}</strong><span style={{ display: "block", fontSize: "13px", color: "#4b5563" }}>{fmtH(h)}{hs > 0 ? ` · dont ${fmtH(hs)} supp.` : ""}</span></span>
              <span style={{ background: st.fond, color: st.texte, borderRadius: "999px", padding: "3px 10px", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap" }}>{st.libelle}</span>
            </button>
            {ouvert === r.salarie.id && (
              <div style={{ marginTop: "10px" }}>
                <CalendrierReleve premier={r.premier} jours={jours} absences={r.absences} />
                {r.commentaire && <p style={{ margin: "8px 0 0", fontSize: "14px" }}>💬 {r.commentaire}</p>}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
