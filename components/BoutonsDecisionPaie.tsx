"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BoutonsDecisionPaie({ demandeId }: { demandeId: string }) {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);

  async function handleDecision(action: "VALIDER" | "REFUSER") {
    setChargement(true);
    await fetch(`/api/demande-evolution-paie/${demandeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    router.refresh();
    setChargement(false);
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleDecision("VALIDER")}
        disabled={chargement}
        className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-green-600 transition disabled:opacity-50"
      >
        ✅ Valider
      </button>
      <button
        onClick={() => handleDecision("REFUSER")}
        disabled={chargement}
        className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50"
      >
        ❌ Refuser
      </button>
    </div>
  );
}