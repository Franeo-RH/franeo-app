"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BoutonsDemandeSalarie({ id }: { id: string }) {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);

  async function decider(action: "valider" | "refuser") {
    let motif = "";
    if (action === "refuser") {
      const saisie = prompt("Motif du refus (visible par le client) :", "");
      if (saisie === null) return;
      motif = saisie;
    } else if (!confirm("Valider cette demande ? La modification sera appliquée immédiatement.")) {
      return;
    }
    setChargement(true);
    const res = await fetch(`/api/demandes-salaries/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, motif }),
    });
    setChargement(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.erreur || "Erreur");
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <button type="button" onClick={() => decider("valider")} disabled={chargement} style={{ background: "#16a34a", color: "#ffffff", border: "none", borderRadius: "8px", padding: "8px 12px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
        ✅ Valider
      </button>
      <button type="button" onClick={() => decider("refuser")} disabled={chargement} style={{ background: "#ef4444", color: "#ffffff", border: "none", borderRadius: "8px", padding: "8px 12px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
        ✖ Refuser
      </button>
    </div>
  );
}
