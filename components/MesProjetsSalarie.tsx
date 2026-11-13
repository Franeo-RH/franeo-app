"use client";

import { useEffect, useState } from "react";

type D = {
  projets: { id: string; nom: string; code: string | null; couleur: string; client: string | null; role: string | null; responsable: string | null; heuresMois: number }[];
  semaines: { semaine: string; projets: { nom: string; couleur: string; heures: number }[] }[];
};
const carte: React.CSSProperties = { background: "#ffffff", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", padding: "18px" };

/** Espace salarié : mes projets et mon planning (option Projets) */
export default function MesProjetsSalarie() {
  const [d, setD] = useState<D | null>(null);
  const [indispo, setIndispo] = useState(false);
  useEffect(() => { fetch("/api/espace-salarie/projets").then(async (r) => (r.ok ? setD(await r.json()) : setIndispo(true))).catch(() => setIndispo(true)); }, []);
  if (indispo) return <section style={carte}><p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>Le suivi des projets n&apos;est pas activé par votre employeur.</p></section>;
  if (!d) return <section style={carte}><p style={{ margin: 0, color: "#6b7280" }}>Chargement…</p></section>;
  return (
    <>
      <section style={carte}>
        <h2 style={{ margin: "0 0 8px", fontSize: "17px" }}>📐 Mes projets</h2>
        {d.projets.length === 0 ? <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>Vous n&apos;êtes planifié sur aucun projet pour les prochaines semaines.</p> : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {d.projets.map((p) => (
              <li key={p.id} style={{ borderTop: "1px solid #f3f4f6", padding: "9px 0", fontSize: "14px", display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 99, background: p.couleur, marginRight: 6 }} /><strong>{p.code ? `${p.code} · ` : ""}{p.nom}</strong>
                  <span style={{ display: "block", fontSize: "12px", color: "#6b7280" }}>{[p.client, p.role, p.responsable ? `Responsable : ${p.responsable}` : null].filter(Boolean).join(" · ")}</span></span>
                <span style={{ whiteSpace: "nowrap", fontSize: "13px" }}>{p.heuresMois.toLocaleString("fr-FR")} h ce mois</span>
              </li>
            ))}
          </ul>
        )}
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#6b7280" }}>Choisissez le projet au moment de pointer votre arrivée ou votre reprise : vos heures y sont comptées automatiquement.</p>
      </section>
      {d.projets.length > 0 && (
        <section style={carte}>
          <h2 style={{ margin: "0 0 8px", fontSize: "17px" }}>🗓️ Mon planning</h2>
          {d.semaines.map((s) => (
            <div key={s.semaine} style={{ borderTop: "1px solid #f3f4f6", padding: "8px 0", fontSize: "14px" }}>
              <strong>Semaine du {new Date(s.semaine).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                {s.projets.length === 0 ? <span style={{ color: "#6b7280", fontSize: "13px" }}>Pas de projet planifié</span> : s.projets.map((p) => (
                  <span key={p.nom} style={{ background: p.couleur, color: "#ffffff", borderRadius: "8px", padding: "3px 8px", fontSize: "12px", fontWeight: 600 }}>{p.nom} · {p.heures.toLocaleString("fr-FR")} h</span>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
