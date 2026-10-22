"use client";

import { useState } from "react";

export default function BoutonSupprimerVariable({ id }: { id: string }) {
  const [chargement, setChargement] = useState(false);

  async function handleSupprimer() {
    const confirmation = confirm("Supprimer cette variable ?");
    if (!confirmation) return;

    setChargement(true);
    const res = await fetch(`/api/paie/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.erreur || "Erreur lors de la suppression");
      setChargement(false);
      return;
    }
    window.location.reload();
  }

  return (
    <button
      onClick={handleSupprimer}
      disabled={chargement}
      title="Supprimer (variable en attente)"
      className="text-red-500 hover:text-red-700 font-semibold text-sm disabled:opacity-50"
    >
      🗑️
    </button>
  );
}
