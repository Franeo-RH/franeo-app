"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Hypothèses des marges : coûts directs (marge brute) et charges / cotisations (marge nette), en % du CA réel */
export default function ReglageMarges({ initial }: { initial: { coutsDirectsPct: number; chargesPct: number } }) {
  const router = useRouter();
  const [f, setF] = useState({ coutsDirectsPct: String(initial.coutsDirectsPct || ""), chargesPct: String(initial.chargesPct || "") });
  const [msg, setMsg] = useState("");
  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/marges", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setMsg(r?.ok ? "✅ Enregistré." : `❌ ${d?.erreur || "Serveur injoignable."}`);
    if (r?.ok) router.refresh();
  }
  return (
    <form onSubmit={enregistrer} className="flex gap-3 flex-wrap items-end">
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Coûts directs (% du CA) → marge brute
        <input inputMode="decimal" value={f.coutsDirectsPct} onChange={(e) => setF({ ...f, coutsDirectsPct: e.target.value })} placeholder="0" className="border rounded-lg px-3 py-2 text-sm w-48" /></label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Charges & cotisations (% du CA) → marge nette
        <input inputMode="decimal" value={f.chargesPct} onChange={(e) => setF({ ...f, chargesPct: e.target.value })} placeholder="0" className="border rounded-lg px-3 py-2 text-sm w-48" /></label>
      <button type="submit" className="bg-gray-900 text-white rounded-lg px-4 py-2 font-semibold text-sm">Enregistrer</button>
      {msg && <span className="text-sm font-semibold">{msg}</span>}
    </form>
  );
}
