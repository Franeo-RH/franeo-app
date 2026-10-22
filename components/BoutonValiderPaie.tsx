"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BoutonValiderPaie({
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

  async function handleValider() {
    const confirmation = confirm("Valider toutes les variables de ce mois pour cette entreprise ?");
    if (!confirmation) return;

    setChargement(true);

    await fetch("/api/paie/valider", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mois, annee, entrepriseId }),
    });

    router.refresh();
    setChargement(false);
  }

  return (
    <button
      onClick={handleValider}
      disabled={chargement}
      className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-50"
    >
      {chargement ? "..." : "✅ Valider le mois"}
    </button>
  );
}