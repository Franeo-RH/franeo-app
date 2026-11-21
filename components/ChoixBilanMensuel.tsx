"use client";

import { useState } from "react";

/** Mon entreprise : recevoir le bilan du mois par e-mail le 1er de chaque mois */
export default function ChoixBilanMensuel({ actif }: { actif: boolean }) {
  const [v, setV] = useState(actif);
  async function changer(x: boolean) {
    setV(x);
    await fetch("/api/entreprise/bilan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actif: x }) });
  }
  return (
    <label className="bg-white rounded-xl shadow p-6 flex items-start gap-3 col-span-2 cursor-pointer">
      <input type="checkbox" className="mt-1 h-4 w-4 accent-orange-500" checked={v} onChange={(e) => changer(e.target.checked)} />
      <span>
        <span className="font-bold">📊 Bilan mensuel par e-mail</span>
        <span className="block text-sm text-gray-600">Le 1er de chaque mois : effectif, arrivées et départs, absences, variables de paie, échéances à venir et facture du mois.</span>
      </span>
    </label>
  );
}
