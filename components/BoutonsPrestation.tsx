"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BoutonsPrestation({ id, statut }: { id: string; statut: string }) {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);

  async function changer(nouveau: string) {
    if (nouveau === "ANNULEE" && !confirm("Annuler cette prestation ? Elle ne sera pas facturée.")) return;
    setChargement(true);
    const res = await fetch(`/api/prestations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: nouveau }),
    });
    setChargement(false);
    if (!res.ok) alert("Erreur");
    router.refresh();
  }

  const bouton = (label: string, nouveau: string, fond: string) => (
    <button type="button" onClick={() => changer(nouveau)} disabled={chargement} style={{ background: fond, color: "#ffffff", border: "none", borderRadius: "8px", padding: "6px 10px", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {statut !== "FAITE" && bouton("✅ Réalisée", "FAITE", "#16a34a")}
      {statut !== "A_FAIRE" && bouton("↩ À traiter", "A_FAIRE", "#6b7280")}
      {statut !== "ANNULEE" && bouton("✖ Annuler", "ANNULEE", "#ef4444")}
    </div>
  );
}
