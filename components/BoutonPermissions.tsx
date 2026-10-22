"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BoutonPermissions({
  entrepriseId,
  moduleId,
  actif,
}: {
  entrepriseId: string;
  moduleId: string;
  actif: boolean;
}) {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);
  const [etat, setEtat] = useState(actif);

  async function handleToggle() {
    setChargement(true);

    await fetch(`/api/entreprises/${entrepriseId}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId, actif: !etat }),
    });

    setEtat(!etat);
    router.refresh();
    setChargement(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={chargement}
      className={`
        relative inline-flex h-8 w-16 items-center rounded-full transition
        ${etat ? "bg-orange-500" : "bg-gray-300"}
        ${chargement ? "opacity-50" : ""}
      `}
    >
      <span className={`
        inline-block h-6 w-6 transform rounded-full bg-white shadow transition
        ${etat ? "translate-x-9" : "translate-x-1"}
      `} />
    </button>
  );
}