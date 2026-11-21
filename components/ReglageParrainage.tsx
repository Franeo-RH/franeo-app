"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const champ = "border rounded-lg px-3 py-2 text-sm";

/** Récompense appliquée automatiquement quand un nouveau client arrive avec un code de parrainage */
export default function ReglageParrainage({ initial }: { initial: { type: string; valeur: number; mois: number; pour: string } }) {
  const router = useRouter();
  const [f, setF] = useState({ ...initial, valeur: String(initial.valeur || ""), mois: String(initial.mois || 1) });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [occupe, setOccupe] = useState(false);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setOccupe(true); setMsg(null);
    const res = await fetch("/api/admin/parrainage", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) }).catch(() => null);
    if (!res) { setOccupe(false); setMsg({ ok: false, t: "Serveur injoignable." }); return; }
    const d = await res.json().catch(() => ({}));
    setOccupe(false);
    setMsg(res.ok ? { ok: true, t: "Réglage enregistré (s'applique aux prochains parrainages)." } : { ok: false, t: d.erreur || "Erreur" });
    if (res.ok) router.refresh();
  }

  return (
    <form onSubmit={enregistrer} className="grid gap-3 items-end" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Récompense
        <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={champ}>
          <option value="AUCUNE">Aucune (suivi seulement)</option>
          <option value="POURCENT">Remise en %</option>
          <option value="MONTANT">Remise en € par mois</option>
        </select></label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Valeur
        <input inputMode="decimal" value={f.valeur} onChange={(e) => setF({ ...f, valeur: e.target.value, type: f.type === "AUCUNE" && e.target.value ? "POURCENT" : f.type })} className={champ} placeholder={f.type === "MONTANT" ? "€" : "%"} /></label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Pendant (mois)
        <input inputMode="numeric" value={f.mois} onChange={(e) => setF({ ...f, mois: e.target.value })} className={champ} /></label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Pour
        <select value={f.pour} onChange={(e) => setF({ ...f, pour: e.target.value })} className={champ}>
          <option value="PARRAIN">La marraine</option>
          <option value="FILLEUL">La filleule</option>
          <option value="LES_DEUX">Les deux</option>
        </select></label>
      <button type="submit" disabled={occupe} className="bg-orange-500 text-white rounded-lg px-4 py-2 font-semibold text-sm hover:bg-orange-600 disabled:opacity-50">Enregistrer</button>
      {msg && <p className={`text-sm font-semibold col-span-full ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.ok ? "✅" : "❌"} {msg.t}</p>}
    </form>
  );
}
