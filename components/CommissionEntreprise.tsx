"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type C = { pct: number; beneficiaire: string | null; debut: string | null; nbMois: number | null; source: string | null } | null;
const champ = "border rounded-lg px-3 py-2 text-sm";
const SOURCES: Record<string, string> = { PARRAINAGE: "parrainage", CODE_PROMO: "code promo", MANUELLE: "saisie manuelle" };

/** Fiche client › Remises & parrainage : commission à reverser (% du CA de ce client) */
export default function CommissionEntreprise({ entrepriseId, commission, moisCourant }: { entrepriseId: string; commission: C; moisCourant: string }) {
  const router = useRouter();
  const [edition, setEdition] = useState(false);
  const [f, setF] = useState({ pct: commission ? String(commission.pct) : "", beneficiaire: commission?.beneficiaire ?? "", debut: commission?.debut ?? moisCourant, nbMois: commission?.nbMois ? String(commission.nbMois) : "" });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  async function envoyer(methode: "PUT" | "DELETE") {
    if (methode === "DELETE" && !confirm("Retirer la commission ? (les versements déjà notés restent)")) return;
    const r = await fetch(`/api/entreprises/${entrepriseId}/commission`, { method: methode, headers: { "Content-Type": "application/json" }, body: methode === "PUT" ? JSON.stringify(f) : undefined }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setMsg(r?.ok ? { ok: true, t: methode === "PUT" ? "Commission enregistrée." : "Commission retirée." } : { ok: false, t: d?.erreur || "Serveur injoignable." });
    if (r?.ok) { setEdition(false); router.refresh(); }
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-bold mb-2">💶 Commission à reverser</h2>
      {commission && !edition ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm"><b>{commission.pct} %</b> du CA de ce client reversé à <b>{commission.beneficiaire || "—"}</b>{commission.debut ? `, dès ${commission.debut.split("-").reverse().join("/")}` : ""}{commission.nbMois ? `, pendant ${commission.nbMois} mois` : ", sans limite de durée"}{commission.source ? ` (${SOURCES[commission.source] ?? commission.source})` : ""}.</p>
          <div className="flex gap-3"><button type="button" onClick={() => setEdition(true)} className="text-sm font-semibold text-orange-600 hover:underline">Modifier</button><button type="button" onClick={() => envoyer("DELETE")} className="text-sm text-red-600 hover:underline">Retirer</button></div>
        </div>
      ) : !edition ? (
        <div className="flex flex-col gap-2 items-start">
          <p className="text-sm text-gray-500">Aucune commission. Elle se crée automatiquement selon le réglage (parrainage ou code promo avec commission), ou à la main.</p>
          <button type="button" onClick={() => setEdition(true)} className="bg-gray-900 text-white rounded-lg px-4 py-2 font-semibold text-sm">➕ Ajouter une commission</button>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); envoyer("PUT"); }} className="grid gap-3 items-end" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">% du CA<input required inputMode="decimal" value={f.pct} onChange={(e) => setF({ ...f, pct: e.target.value })} placeholder="10" className={champ} /></label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Reversé à<input required value={f.beneficiaire} onChange={(e) => setF({ ...f, beneficiaire: e.target.value })} placeholder="Apporteur, parrain…" className={champ} /></label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">À partir de<input type="month" required value={f.debut} onChange={(e) => setF({ ...f, debut: e.target.value })} className={champ} /></label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Pendant (mois)<input inputMode="numeric" value={f.nbMois} onChange={(e) => setF({ ...f, nbMois: e.target.value })} placeholder="vide = sans fin" className={champ} /></label>
          <div className="flex gap-2"><button type="submit" className="bg-orange-500 text-white rounded-lg px-4 py-2 font-semibold text-sm">Enregistrer</button><button type="button" onClick={() => setEdition(false)} className="border rounded-lg px-3 py-2 text-sm">Annuler</button></div>
        </form>
      )}
      {msg && <p className={`text-sm font-semibold mt-2 ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.ok ? "✅" : "❌"} {msg.t}</p>}
      <p className="text-xs text-gray-500 mt-2">Le montant dû chaque mois apparaît dans Abonnements & facturation › 💶 Commissions à reverser.</p>
    </div>
  );
}
