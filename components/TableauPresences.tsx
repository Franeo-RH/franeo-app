"use client";

import { useCallback, useEffect, useState } from "react";
import { fmtH } from "@/lib/heures";

type L = {
  salarie: { id: string; prenom: string; nom: string; poste: string };
  pointages: { type: string; at: string; dansZone: boolean | null; motif: string | null }[];
  heures: number; etat: string; horsZone: number; oubli: boolean;
};
const ETATS: Record<string, { l: string; f: string; t: string }> = {
  PRESENT: { l: "Présent", f: "#dcfce7", t: "#15803d" }, PAUSE: { l: "En pause", f: "#fef3c7", t: "#b45309" },
  PARTI: { l: "Parti", f: "#f3f4f6", t: "#374151" }, ABSENT: { l: "Pas de pointage", f: "#fff7ed", t: "#c2410c" },
};
const LIB: Record<string, string> = { ARRIVEE: "Arrivée", PAUSE: "Pause", REPRISE: "Reprise", DEPART: "Départ" };
const heure = (d: string) => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const iso = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d);

/** Présences d'une journée (client : toute l'entreprise ; manager : son équipe) */
export default function TableauPresences({ api, exportCsv = false }: { api: string; exportCsv?: boolean }) {
  const [jour, setJour] = useState(iso(new Date()));
  const [lignes, setLignes] = useState<L[] | null>(null);
  const [du, setDu] = useState(iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [au, setAu] = useState(iso(new Date()));
  const charger = useCallback(async () => {
    setLignes(null);
    const d = await fetch(`${api}?jour=${jour}`).then((r) => r.json()).catch(() => null);
    setLignes(Array.isArray(d?.lignes) ? d.lignes : []);
  }, [api, jour]);
  useEffect(() => { charger(); }, [charger]);

  const present = lignes?.filter((l) => l.etat === "PRESENT" || l.etat === "PAUSE").length ?? 0;
  const alertes = lignes?.filter((l) => l.horsZone > 0 || l.oubli).length ?? 0;
  const cell: React.CSSProperties = { padding: "10px 8px", borderTop: "1px solid #f3f4f6", fontSize: "14px", verticalAlign: "top" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ background: "#fff", borderRadius: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", padding: "14px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <input type="date" value={jour} onChange={(e) => setJour(e.target.value)} style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "8px" }} aria-label="Jour" />
        <span style={{ fontWeight: 700 }}>👥 {present} présent(s)</span>
        {alertes > 0 && <span style={{ fontWeight: 700, color: "#b91c1c" }}>⚠️ {alertes} alerte(s)</span>}
        {exportCsv && (
          <span style={{ marginLeft: "auto", display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", fontSize: "14px" }}>
            Export du <input type="date" value={du} onChange={(e) => setDu(e.target.value)} style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "6px" }} aria-label="Du" />
            au <input type="date" value={au} onChange={(e) => setAu(e.target.value)} style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "6px" }} aria-label="Au" />
            <a href={`${api}?format=csv&du=${du}&au=${au}`} style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "6px 10px", fontWeight: 700, textDecoration: "none", color: "#111827" }}>📥 Excel</a>
          </span>
        )}
      </div>
      <div style={{ background: "#fff", borderRadius: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ textAlign: "left", background: "#f9fafb", fontSize: "13px" }}><th style={{ padding: "10px 8px" }}>Salarié</th><th style={{ padding: "10px 8px" }}>État</th><th style={{ padding: "10px 8px" }}>Pointages</th><th style={{ padding: "10px 8px" }}>Heures</th><th style={{ padding: "10px 8px" }}>Alertes</th></tr></thead>
          <tbody>
            {lignes === null ? <tr><td colSpan={5} style={cell}>Chargement…</td></tr> : lignes.length === 0 ? <tr><td colSpan={5} style={cell}>Aucun salarié avec un accès à l&apos;espace salarié.</td></tr> : lignes.map((l) => {
              const e = ETATS[l.etat] || ETATS.ABSENT;
              return (
                <tr key={l.salarie.id}>
                  <td style={cell}><strong>{l.salarie.prenom} {l.salarie.nom}</strong><span style={{ display: "block", fontSize: "12px", color: "#6b7280" }}>{l.salarie.poste}</span></td>
                  <td style={cell}><span style={{ background: e.f, color: e.t, borderRadius: "999px", padding: "3px 10px", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap" }}>{e.l}</span></td>
                  <td style={cell}>{l.pointages.length === 0 ? "—" : l.pointages.map((p, i) => <span key={i} style={{ display: "inline-block", marginRight: "8px", color: p.dansZone === false ? "#b91c1c" : undefined }} title={p.motif ?? ""}>{LIB[p.type]} {heure(p.at)}{p.dansZone === false ? " ⚠️" : ""}</span>)}</td>
                  <td style={cell}>{l.heures > 0 ? fmtH(l.heures) : "—"}</td>
                  <td style={cell}>{[l.horsZone > 0 ? `${l.horsZone} hors zone` : "", l.oubli ? "Départ non pointé" : ""].filter(Boolean).join(" · ") || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
