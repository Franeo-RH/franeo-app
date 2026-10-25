"use client";

import { useState } from "react";

export default function BoutonResetDemo() {
  const [etat, setEtat] = useState<"" | "chargement" | "ok" | "erreur">("");
  const [message, setMessage] = useState("");

  async function lancer() {
    if (!confirm("Remettre la démo à zéro maintenant ? Les données saisies par les visiteurs seront effacées (sauf leurs suggestions).")) return;
    setEtat("chargement");
    setMessage("");
    const res = await fetch("/api/demo/reinitialiser", { method: "POST" });
    if (res.ok) {
      setEtat("ok");
      setMessage("Démo réinitialisée ✓");
    } else {
      const data = await res.json().catch(() => ({}));
      setEtat("erreur");
      setMessage(data.erreur || "Erreur lors de la réinitialisation");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
      {message && (
        <span style={{ fontSize: "13px", fontWeight: 600, color: etat === "ok" ? "#15803d" : "#b91c1c" }}>{message}</span>
      )}
      <button
        onClick={lancer}
        disabled={etat === "chargement"}
        style={{ background: "#111827", color: "#ffffff", border: "none", borderRadius: "8px", padding: "8px 14px", fontWeight: 600, fontSize: "13px", cursor: "pointer", opacity: etat === "chargement" ? 0.6 : 1 }}
      >
        {etat === "chargement" ? "Réinitialisation…" : "🔄 Réinitialiser la démo"}
      </button>
    </div>
  );
}
