"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Liste déroulante admin : changer le pack RH d'un client (effet immédiat, sans mail) */
export default function BoutonPackRH({ entrepriseId, abonnementId, packs }: { entrepriseId: string; abonnementId: string; packs: { id: string; nom: string; prixMensuel: number }[] }) {
  const router = useRouter();
  const [valeur, setValeur] = useState(abonnementId);
  const [etat, setEtat] = useState<"" | "…" | "✓ Sauvegardé" | "Erreur">("");

  async function changer(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    setValeur(v);
    setEtat("…");
    const res = await fetch(`/api/entreprises/${entrepriseId}/abonnements`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ abonnementId: v || null, prevenir: false }),
    });
    setEtat(res.ok ? "✓ Sauvegardé" : "Erreur");
    if (res.ok) router.refresh();
    setTimeout(() => setEtat(""), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <select value={valeur} onChange={changer} disabled={etat === "…"} className="border rounded-lg px-3 py-1.5 text-sm" aria-label="Pack RH">
        <option value="">— Aucun (accès de base) —</option>
        {packs.map((p) => <option key={p.id} value={p.id}>{p.nom} ({p.prixMensuel}€)</option>)}
      </select>
      {etat && <span className={`text-xs ${etat === "Erreur" ? "text-red-500" : etat === "…" ? "text-gray-400" : "text-green-500"}`}>{etat}</span>}
    </div>
  );
}
