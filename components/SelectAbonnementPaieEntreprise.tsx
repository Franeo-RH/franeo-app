"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  entrepriseId: string;
  formuleActuelleId: string;
  formules: { id: string; nom: string }[];
}

export default function SelectAbonnementPaieEntreprise({
  entrepriseId,
  formuleActuelleId,
  formules,
}: Props) {
  const router = useRouter();
  const [valeur, setValeur] = useState(formuleActuelleId);
  const [etat, setEtat] = useState<"" | "chargement" | "ok" | "erreur">("");

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nouvelle = e.target.value;
    setValeur(nouvelle);
    setEtat("chargement");

    const res = await fetch(`/api/abonnement-paie/${entrepriseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ abonnementPaieId: nouvelle || null }),
    });

    if (!res.ok) {
      setValeur(formuleActuelleId);
      setEtat("erreur");
      return;
    }

    setEtat("ok");
    router.refresh();
    setTimeout(() => setEtat(""), 2000);
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={valeur}
        onChange={handleChange}
        disabled={etat === "chargement"}
        className="border rounded-lg px-3 py-2 text-sm flex-1"
      >
        <option value="">Aucune formule</option>
        {formules.map((f) => (
          <option key={f.id} value={f.id}>{f.nom}</option>
        ))}
      </select>
      {etat === "chargement" && <span className="text-gray-400 text-sm">...</span>}
      {etat === "ok" && <span className="text-green-500 text-sm">✅ Enregistré</span>}
      {etat === "erreur" && <span className="text-red-500 text-sm">❌ Erreur</span>}
    </div>
  );
}