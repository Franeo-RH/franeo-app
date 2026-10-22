"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BoutonDemandeEvolution({
  entrepriseId,
  abonnementId,
  disabled,
}: {
  entrepriseId: string;
  abonnementId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);

  async function handleDemande() {
    setChargement(true);

    const res = await fetch("/api/demandes-evolution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entrepriseId, abonnementId }),
    });

    const data = await res.json();
    console.log("Réponse:", res.status, data);

    if (res.ok) {
      router.refresh();
    } else {
      alert(data.erreur || "Une erreur est survenue");
    }

    setChargement(false);
  }

  return (
    <button
      onClick={handleDemande}
      disabled={disabled || chargement}
      className="bg-black text-white py-2 rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-40 w-full"
    >
      {chargement ? "Envoi..." : "Demander cette formule"}
    </button>
  );
}