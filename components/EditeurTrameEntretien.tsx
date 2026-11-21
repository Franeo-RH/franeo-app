"use client";

import { useEffect, useState } from "react";
import { TYPES_ENTRETIEN } from "@/lib/entretiens";

type R = { cle?: string; label: string };
const ORIGINES: Record<string, string> = { CLIENT: "Trame personnalisée de l'entreprise", FRANEO: "Modèle FRANEO RH", DEFAUT: "Trame par défaut (Code du travail)" };

/**
 * Paramétrage de la trame des comptes rendus d'entretien, par type.
 * admin : modèle FRANEO (entreprises = liste pour régler un client précis) ; client : sa propre trame.
 */
export default function EditeurTrameEntretien({ entreprises, client = false }: { entreprises?: { id: string; nom: string }[]; client?: boolean }) {
  const [type, setType] = useState("ANNUEL");
  const [entrepriseId, setEntrepriseId] = useState("");
  const [rubriques, setRubriques] = useState<R[]>([]);
  const [origine, setOrigine] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const qs = (t = type) => `type=${t}${entrepriseId ? `&entrepriseId=${entrepriseId}` : ""}`;
  const charger = () => fetch(`/api/trames-entretien?${qs()}`).then((r) => r.json()).then((d) => { setRubriques(d.rubriques ?? []); setOrigine(d.origine ?? ""); if (d.avertissement) setMsg({ ok: false, t: d.avertissement }); }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setMsg(null); charger(); }, [type, entrepriseId]);

  const maj = (i: number, label: string) => setRubriques(rubriques.map((r, j) => (j === i ? { ...r, label } : r)));
  const bouger = (i: number, d: number) => { const n = [...rubriques]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setRubriques(n); };
  async function enregistrer() {
    const r = await fetch(`/api/trames-entretien?${qs()}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, rubriques: rubriques.filter((x) => x.label.trim()) }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setMsg(r?.ok ? { ok: true, t: "Trame enregistrée : elle s'applique aux prochains comptes rendus." } : { ok: false, t: d?.erreur || "Serveur injoignable." });
    if (r?.ok) charger();
  }
  async function reinitialiser() {
    if (!confirm("Revenir à la trame par défaut pour ce type d'entretien ?")) return;
    await fetch(`/api/trames-entretien?${qs()}`, { method: "DELETE" });
    setMsg({ ok: true, t: "Trame réinitialisée." });
    charger();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 flex-wrap items-end">
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Type d&apos;entretien
          <select value={type} onChange={(e) => setType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            {Object.entries(TYPES_ENTRETIEN).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select></label>
        {!client && entreprises && (
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Pour
            <select value={entrepriseId} onChange={(e) => setEntrepriseId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Tous les clients (modèle FRANEO RH)</option>
              {entreprises.map((e) => <option key={e.id} value={e.id}>{e.nom} (trame propre)</option>)}
            </select></label>
        )}
        {origine && <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: "#fff7ed", color: "#c2410c" }}>Actuellement : {ORIGINES[origine]}</span>}
      </div>
      <ol className="flex flex-col gap-2">
        {rubriques.map((r, i) => (
          <li key={i} className="flex gap-2 items-center">
            <span className="text-gray-400 text-sm w-6 text-right">{i + 1}.</span>
            <input value={r.label} onChange={(e) => maj(i, e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Intitulé de la rubrique" />
            <button type="button" onClick={() => bouger(i, -1)} className="px-2 text-gray-500" aria-label="Monter">▲</button>
            <button type="button" onClick={() => bouger(i, 1)} className="px-2 text-gray-500" aria-label="Descendre">▼</button>
            <button type="button" onClick={() => setRubriques(rubriques.filter((_, j) => j !== i))} className="px-2 text-red-600" aria-label="Supprimer">🗑️</button>
          </li>
        ))}
      </ol>
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => setRubriques([...rubriques, { label: "" }])} className="border rounded-lg px-4 py-2 font-semibold text-sm">➕ Ajouter une rubrique</button>
        <button type="button" onClick={enregistrer} className="bg-orange-500 text-white rounded-lg px-4 py-2 font-semibold text-sm">💾 Enregistrer la trame</button>
        {origine === (client || entrepriseId ? "CLIENT" : "FRANEO") && <button type="button" onClick={reinitialiser} className="text-sm text-gray-600 underline">Réinitialiser</button>}
      </div>
      {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.ok ? "✅" : "❌"} {msg.t}</p>}
      <p className="text-xs text-gray-500">Pour l&apos;entretien professionnel, gardez les rubriques obligatoires : perspectives d&apos;évolution, formations, information CPF / CEP / VAE (art. L6315-1). Les comptes rendus déjà saisis gardent leur trame d&apos;origine.</p>
    </div>
  );
}
