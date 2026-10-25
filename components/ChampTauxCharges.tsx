"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChampTauxCharges({ entrepriseId, valeur }: { entrepriseId: string; valeur: number }) {
  const router = useRouter();
  const [taux, setTaux] = useState(String(valeur));
  const [etat, setEtat] = useState<"" | "chargement" | "ok" | "erreur">("");
  const [message, setMessage] = useState("");

  async function enregistrer() {
    setEtat("chargement");
    const res = await fetch(`/api/entreprises/${entrepriseId}/taux-charges`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tauxCharges: taux.replace(",", ".") }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEtat("erreur");
      setMessage(data.erreur || "Erreur");
      return;
    }
    setEtat("ok");
    setMessage("Enregistré ✓");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      <label htmlFor="taux-charges" className="text-sm text-gray-500">Taux de charges patronales</label>
      <input
        id="taux-charges"
        type="number"
        min="0"
        max="100"
        step="0.5"
        value={taux}
        onChange={(e) => { setTaux(e.target.value); setEtat(""); }}
        className="border rounded-lg px-3 py-2 text-sm"
        style={{ width: "90px" }}
      />
      <span className="text-sm">%</span>
      <button
        type="button"
        onClick={enregistrer}
        disabled={etat === "chargement"}
        style={{ background: "#f97316", color: "#ffffff", border: "none", borderRadius: "8px", padding: "8px 14px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
      >
        {etat === "chargement" ? "…" : "Enregistrer"}
      </button>
      {message && <span style={{ fontSize: "13px", color: etat === "ok" ? "#15803d" : "#b91c1c" }}>{message}</span>}
    </div>
  );
}
