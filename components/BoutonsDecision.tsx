"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BoutonsDecision({
  demandeId,
  entrepriseId,
  abonnementId,
}: {
  demandeId: string;
  entrepriseId: string;
  abonnementId: string;
}) {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);

  async function handleDecision(decision: "Acceptée" | "Refusée") {
    setChargement(true);

    const res = await fetch(`/api/demandes-evolution/${demandeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, entrepriseId, abonnementId }),
    });

    const data = await res.json();
    console.log("Réponse API:", res.status, data);

    router.refresh();
    setChargement(false);
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleDecision("Acceptée")}
        disabled={chargement}
        className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-green-600 transition"
      >
        ✅ Accepter
      </button>
      <button
        onClick={() => handleDecision("Refusée")}
        disabled={chargement}
        className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-red-600 transition"
      >
        ❌ Refuser
      </button>
    </div>
  );
}