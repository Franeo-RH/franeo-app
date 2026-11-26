"use client";

import { useEffect, useState } from "react";
import { VISITES, type ProfilVisite } from "@/lib/visite";

/**
 * Présentation guidée, étape par étape.
 * - Démo : à chaque ouverture de la démo (cookie posé par /api/demo).
 * - Vrai compte : à la première connexion (afficher = true tant que la présentation n'a pas été vue).
 * On peut la revoir à tout moment : window.dispatchEvent(new Event("franeo:visite")).
 */
export default function VisiteGuidee({ profil, afficher }: { profil: ProfilVisite; afficher: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  const [i, setI] = useState(0);
  const v = VISITES[profil];
  const e = v.etapes[i];
  const dernier = i === v.etapes.length - 1;

  useEffect(() => {
    const cookieDemo = document.cookie.split("; ").some((c) => c === "fr_visite=1");
    let dejaVue = false;
    try { dejaVue = localStorage.getItem("fr-visite-vue") === "1"; } catch {}
    if ((afficher && !dejaVue) || cookieDemo) { setOuvert(true); setI(0); }
    const revoir = () => { setI(0); setOuvert(true); };
    window.addEventListener("franeo:visite", revoir);
    return () => window.removeEventListener("franeo:visite", revoir);
  }, [afficher]);

  useEffect(() => {
    if (!ouvert) return;
    const touche = (ev: KeyboardEvent) => {
      if (ev.key === "ArrowRight") setI((x) => Math.min(x + 1, v.etapes.length - 1));
      if (ev.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
      if (ev.key === "Escape") fermer();
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert]);

  function fermer() {
    setOuvert(false);
    document.cookie = "fr_visite=; path=/; max-age=0";
    if (afficher) { try { localStorage.setItem("fr-visite-vue", "1"); } catch {} }
    fetch("/api/visite", { method: "POST" }).catch(() => {});
  }

  if (!ouvert) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={v.titre} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(17,24,39,.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 460, background: "#fff", borderRadius: 24, boxShadow: "0 30px 80px rgba(0,0,0,.3)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Progression */}
        <div style={{ display: "flex", gap: 4, padding: "14px 18px 0" }}>
          {v.etapes.map((_, k) => <span key={k} style={{ flex: 1, height: 4, borderRadius: 4, background: k <= i ? "#f97316" : "#f3f4f6", transition: "background .25s" }} />)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 18px 0", fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>
          <span>{i + 1} / {v.etapes.length}</span>
          <button type="button" onClick={fermer} style={{ background: "none", border: "none", color: "#6b7280", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Passer ✕</button>
        </div>

        <div key={i} style={{ padding: "18px 28px 8px", textAlign: "center", animation: "frVisite .3s ease both", minHeight: 250 }}>
          <div style={{ width: 76, height: 76, margin: "0 auto 14px", borderRadius: "50%", background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38 }}>{e.ico}</div>
          {i === 0 && <p style={{ fontSize: 12, fontWeight: 800, color: "#f97316", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 4px" }}>{v.titre}</p>}
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 8px", letterSpacing: "-.01em" }}>{e.titre}</h2>
          <p style={{ fontSize: 15, color: "#4b5563", lineHeight: 1.5, margin: 0 }}>{e.texte}</p>
          {e.points && (
            <ul style={{ listStyle: "none", padding: 0, margin: "14px auto 0", display: "flex", flexDirection: "column", gap: 6, textAlign: "left", maxWidth: 340 }}>
              {e.points.map((pt) => <li key={pt} style={{ display: "flex", gap: 8, fontSize: 14, color: "#374151" }}><span style={{ color: "#f97316", fontWeight: 800 }}>✓</span>{pt}</li>)}
            </ul>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, padding: "14px 18px 18px" }}>
          {i > 0 && <button type="button" onClick={() => setI(i - 1)} style={{ flex: "0 0 auto", padding: "12px 18px", borderRadius: 12, border: "2px solid #e5e7eb", background: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", color: "#374151" }}>←</button>}
          <button type="button" onClick={() => (dernier ? fermer() : setI(i + 1))} style={{ flex: 1, padding: "13px 18px", borderRadius: 12, border: "none", background: "#f97316", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", boxShadow: "0 8px 20px rgba(249,115,22,.25)" }}>
            {dernier ? "Commencer" : i === 0 ? "Découvrir →" : "Suivant →"}
          </button>
        </div>
      </div>
      <style>{"@keyframes frVisite{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}"}</style>
    </div>
  );
}
