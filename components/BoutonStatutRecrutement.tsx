"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BoutonStatutRecrutement({
  id,
  statutActuel,
  statuts,
}: {
  id: string;
  statutActuel: string;
  statuts: string[];
}) {
  const [statut, setStatut] = useState(statutActuel);
  const [chargement, setChargement] = useState(false);
  const router = useRouter();

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nouveau = e.target.value;
    setChargement(true);
    setStatut(nouveau);

    await fetch(`/api/recrutement/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: nouveau }),
    });

    setChargement(false);
    router.refresh();
  }

  const couleur = statut === "Clôturée" ? "bg-green-100 text-green-600" :
    statut === "Candidats proposés" ? "bg-blue-100 text-blue-600" :
    statut === "En cours" ? "bg-orange-100 text-orange-600" :
    "bg-gray-100 text-gray-600";

  return (
    <select
      value={statut}
      onChange={handleChange}
      disabled={chargement}
      className={`px-4 py-2 rounded-lg font-semibold text-sm border-0 cursor-pointer ${couleur}`}
    >
      {statuts.map(s => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}