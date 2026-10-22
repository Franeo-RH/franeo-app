"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  formuleId: string;
  formuleNom: string;
  prixActuel: number;
  prixNouveau: number;
  demandeEnAttente: boolean;
}

export default function BoutonDemandeEvolutionPaie({
  formuleId,
  formuleNom,
  prixActuel,
  prixNouveau,
  demandeEnAttente,
}: Props) {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  async function handleClick() {
    if (demandeEnAttente) {
      setErreur("Une demande est déjà en attente.");
      return;
    }

    setChargement(true);
    setErreur("");

    const res = await fetch("/api/demande-evolution-paie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nouvelleFormuleId: formuleId }),
    });

    if (!res.ok) {
      const data = await res.json();
      setErreur(data.erreur || "Erreur lors de la demande");
      setChargement(false);
      return;
    }

    router.refresh();
  }

  const label = prixActuel === 0
    ? "✉️ Souscrire"
    : prixNouveau > prixActuel
    ? "⬆️ Demander un upgrade"
    : "⬇️ Demander une réduction";

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={chargement || demandeEnAttente}
        className="bg-orange-500 text-white text-center py-2 rounded-lg font-semibold text-sm hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {chargement ? "Envoi..." : label}
      </button>
      {erreur && <p className="text-red-500 text-xs text-center">{erreur}</p>}
    </div>
  );
}