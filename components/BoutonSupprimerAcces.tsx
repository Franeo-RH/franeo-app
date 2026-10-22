"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BoutonSupprimerAcces({
  userId,
  entrepriseId,
}: {
  userId: string;
  entrepriseId: string;
}) {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);

  async function handleSupprimer() {
    const confirmation = confirm("Supprimer cet accès ?");
    if (!confirmation) return;

    setChargement(true);

    await fetch(`/api/utilisateurs/${userId}`, {
      method: "DELETE",
    });

    router.refresh();
    setChargement(false);
  }

  return (
    <button
      onClick={handleSupprimer}
      disabled={chargement}
      className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-red-600 transition"
    >
      🗑️ Supprimer
    </button>
  );
}