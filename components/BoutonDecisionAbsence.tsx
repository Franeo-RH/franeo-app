"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BoutonDecisionAbsence({ absenceId }: { absenceId: string }) {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);

  async function handleDecision(decision: "Validé" | "Refusé") {
    setChargement(true);

    await fetch(`/api/absences/${absenceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: decision }),
    });

    router.refresh();
    setChargement(false);
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleDecision("Validé")}
        disabled={chargement}
        className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-green-600 transition"
      >
        ✅
      </button>
      <button
        onClick={() => handleDecision("Refusé")}
        disabled={chargement}
        className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-red-600 transition"
      >
        ❌
      </button>
    </div>
  );
}