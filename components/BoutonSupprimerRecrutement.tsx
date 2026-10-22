"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BoutonSupprimerRecrutement({ id, poste }: { id: string; poste: string }) {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);

  async function handleSupprimer() {
    if (!confirm(`Supprimer la demande de recrutement "${poste}" ?`)) return;

    setChargement(true);
    await fetch(`/api/recrutement/${id}`, { method: "DELETE" });
    router.refresh();
    setChargement(false);
  }

  return (
    <button
      onClick={handleSupprimer}
      disabled={chargement}
      className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-red-600 transition disabled:opacity-50"
    >
      {chargement ? "..." : "🗑️ Supprimer"}
    </button>
  );
}