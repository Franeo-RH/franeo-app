"use client";

import { useEffect, useState } from "react";
import { fmtH } from "@/lib/heures";

type J = { jour: string; heures: number; pointages: { type: string; at: string; dansZone: boolean | null }[] };
const LIB: Record<string, string> = { ARRIVEE: "Arrivée", PAUSE: "Pause", REPRISE: "Reprise", DEPART: "Départ" };

/** Tableau de bord du salarié : son journal de pointages des 14 derniers jours */
export default function HistoriqueBadge() {
  const [jours, setJours] = useState<J[] | null>(null);
  useEffect(() => { fetch("/api/espace-salarie/badge/historique").then((r) => (r.ok ? r.json() : [])).then((d) => setJours(Array.isArray(d) ? d : [])).catch(() => setJours([])); }, []);
  if (!jours || jours.length === 0) return null;
  const total = jours.reduce((a, j) => a + j.heures, 0);
  return (
    <section style={{ background: "#ffffff", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", padding: "18px" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: "18px" }}>📍 Mes pointages (14 derniers jours)</h2>
      <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#6b7280" }}>Total : {fmtH(total)}</p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {jours.map((j) => (
          <li key={j.jour} style={{ borderTop: "1px solid #f3f4f6", padding: "9px 0", fontSize: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
              <strong style={{ textTransform: "capitalize" }}>{new Date(`${j.jour}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })}</strong>
              <span>{j.heures > 0 ? fmtH(j.heures) : "—"}</span>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#4b5563" }}>
              {j.pointages.map((p, i) => (
                <span key={i} style={{ marginRight: "10px", color: p.dansZone === false ? "#b91c1c" : undefined }}>
                  {LIB[p.type]} {new Date(p.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}{p.dansZone === false ? " ⚠️" : ""}
                </span>
              ))}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
