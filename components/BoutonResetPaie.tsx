"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BoutonResetPaie({
  mois,
  annee,
  entrepriseId,
}: {
  mois: number;
  annee: number;
  entrepriseId: string;
}) {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);

  async function handleReset() {
    const confirmation = confirm("Réinitialiser toutes les variables de ce mois ? Cette action est traçée mais irréversible.");
    if (!confirmation) return;

    setChargement(true);

    await fetch("/api/paie/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mois, annee, entrepriseId }),
    });

    router.refresh();
    setChargement(false);
  }

  return (
    <button
      onClick={handleReset}
      disabled={chargement}
      className="bg-red-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-red-600 transition disabled:opacity-50"
    >
      {chargement ? "..." : "🔄 Réinitialiser le mois"}
    </button>
  );
}