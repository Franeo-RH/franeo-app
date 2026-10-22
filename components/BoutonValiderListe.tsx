"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Valide d'un coup une liste de variables en attente */
export default function BoutonValiderListe({
  ids,
  label,
  petit = false,
}: {
  ids: string[];
  label: string;
  petit?: boolean;
}) {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);

  async function handleValider() {
    if (!confirm(`${label} ? (${ids.length} variable(s) en attente)`)) return;

    setChargement(true);
    const res = await fetch("/api/paie/valider", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) alert("Erreur lors de la validation");
    router.refresh();
    setChargement(false);
  }

  return (
    <button
      onClick={handleValider}
      disabled={chargement || ids.length === 0}
      className={`bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition disabled:opacity-50 ${
        petit ? "px-3 py-1 text-xs" : "px-5 py-2"
      }`}
    >
      {chargement ? "..." : `✅ ${label} (${ids.length})`}
    </button>
  );
}
