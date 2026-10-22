"use client";

import { useState } from "react";

type Formule = {
  id: string;
  code: string;
  nom: string;
  prixMensuel: number;
};

export default function BoutonAbonnementPaie({
  entrepriseId,
  abonnementPaieId,
  formules,
}: {
  entrepriseId: string;
  abonnementPaieId: string;
  formules: Formule[];
}) {
  const [valeur, setValeur] = useState(abonnementPaieId);
  const [chargement, setChargement] = useState(false);
  const [succes, setSucces] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nouvelleFormule = e.target.value;
    setValeur(nouvelleFormule);
    setChargement(true);
    setSucces(false);

    await fetch(`/api/abonnement-paie/${entrepriseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ abonnementPaieId: nouvelleFormule || null }),
    });

    setChargement(false);
    setSucces(true);
    setTimeout(() => setSucces(false), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={valeur}
        onChange={handleChange}
        disabled={chargement}
        className="border rounded-lg px-3 py-1.5 text-sm"
      >
        <option value="">— Aucune —</option>
        {formules.map((f) => (
          <option key={f.id} value={f.id}>
            {f.nom} ({f.prixMensuel}€)
          </option>
        ))}
      </select>
      {chargement && <span className="text-xs text-gray-400">...</span>}
      {succes && <span className="text-xs text-green-500">✓ Sauvegardé</span>}
    </div>
  );
}