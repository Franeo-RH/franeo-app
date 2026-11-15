"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type MiseAJourAffichee = { id: string; titre: string; contenu: string; createdAt: string | Date };

/** Découpe une mise à jour : version et date (1re ligne), puis une nouveauté par ligne « • … » */
function lire(m: MiseAJourAffichee) {
  const lignes = m.contenu.split("\n").map((l) => l.trim()).filter(Boolean);
  const entete = lignes[0] && !lignes[0].startsWith("•") ? lignes.shift()! : "";
  const titre = m.titre.replace(/^🚀\s*Mise à jour\s+\S+\s+—\s*/, "").replace(/\s*\(espace salarié\)$/, "");
  return { entete, titre, points: lignes.map((l) => l.replace(/^•\s*/, "")) };
}

const EMOJI_DEBUT = new RegExp("^(\\p{Extended_Pictographic}\\uFE0F?)\\s*(.*)$", "u");

/** Une nouveauté : emoji en pastille, puis le texte (la partie avant « : » en gras) */
function Point({ texte }: { texte: string }) {
  const m = /^(\p{Extended_Pictographic}️?)\s*(.*)$/u.exec(texte);
  const icone = m ? m[1] : "✨";
  const reste = m ? m[2] : texte;
  const i = reste.indexOf(" : ");
  return (
    <li style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
      <span aria-hidden style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 10, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{icone}</span>
      <span style={{ fontSize: 14, lineHeight: 1.5, color: "#374151", paddingTop: 6 }}>
        {i > 0 ? <><strong style={{ color: "#111827" }}>{reste.slice(0, i)}</strong>{reste.slice(i)}</> : reste}
      </span>
    </li>
  );
}

/** Contenu visuel d'une mise à jour (utilisé sur le tableau de bord et dans l'historique) */
export function VisuelMiseAJour({ m, compact = false }: { m: MiseAJourAffichee; compact?: boolean }) {
  const { entete, titre, points } = lire(m);
  return (
    <div style={{ background: "#ffffff", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
      <div style={{ background: "linear-gradient(135deg, #111827 0%, #1f2937 55%, #ea580c 160%)", color: "#ffffff", padding: compact ? "14px 18px" : "20px 22px" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.6px", textTransform: "uppercase", color: "#fdba74" }}>🚀 Mise à jour {entete && `· ${entete}`}</p>
        <p style={{ margin: "6px 0 0", fontSize: compact ? 17 : 21, fontWeight: 800, lineHeight: 1.25 }}>{titre}</p>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: compact ? "14px 18px" : "18px 22px", display: "grid", gap: 12, gridTemplateColumns: compact ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))" }}>
        {points.map((p, i) => <Point key={i} texte={p} />)}
      </ul>
    </div>
  );
}

/** Tableau de bord : résumé de la dernière mise à jour, jusqu'au clic sur « J'ai lu » */
export default function CarteMiseAJour({ miseAJour, lienHistorique }: { miseAJour: MiseAJourAffichee | null; lienHistorique?: string }) {
  const router = useRouter();
  const [lue, setLue] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  if (!miseAJour || lue) return null;

  async function valider() {
    setEnvoi(true);
    const r = await fetch(`/api/communications/${miseAJour!.id}/lu`, { method: "POST" });
    setEnvoi(false);
    if (r.ok) { setLue(true); router.refresh(); }
  }

  return (
    <section aria-label="Dernière mise à jour" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <VisuelMiseAJour m={miseAJour} />
      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>
        {lienHistorique && <Link href={lienHistorique} style={{ fontSize: 14, color: "#ea580c", fontWeight: 600 }}>Toutes les mises à jour →</Link>}
        <button type="button" onClick={valider} disabled={envoi} style={{ background: "#16a34a", color: "#ffffff", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: envoi ? 0.6 : 1 }}>
          {envoi ? "…" : "✅ J'ai lu"}
        </button>
      </div>
    </section>
  );
}
