"use client";

import { useEffect, useState } from "react";

type Membre = { id: string; nom: string; poste: string; reste: number; enCours: number; enAttente: number };

/** Espace manager / dirigeant : soldes de congés de l'équipe */
export default function CongesEquipe() {
  const [l, setL] = useState<Membre[] | null>(null);
  useEffect(() => { fetch("/api/espace-salarie/conges?equipe=1").then((r) => (r.ok ? r.json() : null)).then(setL).catch(() => setL(null)); }, []);
  if (!l || l.length === 0) return null;
  return (
    <section style={{ background: "#ffffff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", padding: 18 }} aria-labelledby="t-conges-equipe">
      <h2 id="t-conges-equipe" style={{ margin: "0 0 8px", fontSize: 18 }}>🏖️ Congés de mon équipe</h2>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {l.map((m) => (
          <li key={m.id} style={{ borderTop: "1px solid #f3f4f6", padding: "10px 0", display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14 }}>
            <span style={{ minWidth: 0 }}><strong>{m.nom}</strong><span style={{ color: "#6b7280" }}> · {m.poste}</span></span>
            <span style={{ whiteSpace: "nowrap" }}>
              <strong style={{ color: m.reste > 0 ? "#15803d" : "#111827" }}>{m.reste} j</strong>
              <span style={{ color: "#6b7280" }}> · {m.enCours} j en cours{m.enAttente ? ` · ${m.enAttente} j demandés` : ""}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
