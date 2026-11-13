"use client";

import { useEffect, useState } from "react";
import { LIBELLES_ABSENCE } from "@/lib/espace-salarie";

type Jour = { jour: string; absence: { type: string; enAttente: boolean } | null; projets: { nom: string; code: string | null; couleur: string; heures: number; role: string | null }[] };
const carte: React.CSSProperties = { background: "#ffffff", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", padding: "18px" };

/** Tableau de bord du salarié : son planning prévisionnel de la semaine (projets et absences, du lundi au vendredi) */
export default function PlanningSemaineSalarie() {
  const [semaine, setSemaine] = useState<Jour[] | null>(null);
  useEffect(() => { fetch("/api/espace-salarie/projets").then(async (r) => { if (r.ok) setSemaine((await r.json()).semaine ?? []); }).catch(() => {}); }, []);
  if (!semaine) return null;
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const vide = semaine.every((j) => !j.projets.length && !j.absence);

  return (
    <section style={carte}>
      <h2 style={{ margin: "0 0 10px", fontSize: "17px" }}>📅 Mon planning de la semaine</h2>
      {vide ? (
        <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>Aucun projet planifié pour vous cette semaine.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px" }}>
          {semaine.map((j) => {
            const estAujourdhui = j.jour === aujourdhui;
            const passe = j.jour < aujourdhui;
            return (
              <div key={j.jour} style={{ borderRadius: "12px", padding: "10px", border: `2px solid ${estAujourdhui ? "#f97316" : "#f3f4f6"}`, background: estAujourdhui ? "#fff7ed" : "#ffffff", opacity: passe ? 0.6 : 1 }}>
                <p style={{ margin: "0 0 6px", fontWeight: 800, fontSize: "13px", textTransform: "capitalize" }}>
                  {new Date(`${j.jour}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" })}
                  {estAujourdhui && <span style={{ color: "#ea580c" }}> · aujourd&apos;hui</span>}
                </p>
                {j.absence ? (
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#7c3aed" }}>
                    🏖️ {LIBELLES_ABSENCE[j.absence.type] || "Absence"}{j.absence.enAttente ? " (en attente)" : ""}
                  </p>
                ) : null}
                {j.projets.length === 0 && !j.absence && <p style={{ margin: 0, fontSize: "13px", color: "#9ca3af" }}>Pas de projet</p>}
                {j.projets.map((p) => (
                  <div key={p.nom} style={{ marginTop: "4px", borderLeft: `4px solid ${p.couleur}`, paddingLeft: "8px", fontSize: "13px", opacity: j.absence && !j.absence.enAttente ? 0.5 : 1 }}>
                    <strong>{p.code ? `${p.code} · ` : ""}{p.nom}</strong>
                    <span style={{ display: "block", color: "#6b7280" }}>≈ {p.heures.toLocaleString("fr-FR")} h{p.role ? ` · ${p.role}` : ""}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
      <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#6b7280" }}>Planning prévisionnel fixé par votre employeur (heures par jour ≈ heures prévues par semaine ÷ 5). Pointez avec le projet ou indiquez-le dans votre relevé.</p>
    </section>
  );
}
