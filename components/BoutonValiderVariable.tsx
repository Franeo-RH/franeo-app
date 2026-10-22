"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BoutonValiderVariable({ id }: { id: string }) {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);

  async function handleValider() {
    setChargement(true);

    await fetch(`/api/paie/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "Validé" }),
    });

    router.refresh();
    setChargement(false);
  }

  return (
    <button
      onClick={handleValider}
      disabled={chargement}
      className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-green-600 transition"
    >
      ✅
    </button>
  );
}