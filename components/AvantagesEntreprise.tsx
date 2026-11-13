"use client";

import { useEffect, useState } from "react";
import { AUTRES_SUGGERES, PLAFOND_TR_2026, type AvantagesEntreprise as A } from "@/lib/avantages";

/** Fiche entreprise : avantages versés chaque mois (tickets restaurant, panier repas, autres) */
export default function AvantagesEntreprise({ entrepriseId, modifiable = true }: { entrepriseId?: string; modifiable?: boolean }) {
  const url = `/api/entreprises/avantages${entrepriseId ? `?entrepriseId=${entrepriseId}` : ""}`;
  const [a, setA] = useState<A | null>(null);
  const [nouveau, setNouveau] = useState("");
  const [etat, setEtat] = useState<{ ok: boolean; t: string } | null>(null);

  useEffect(() => { fetch(url).then((r) => r.json()).then((d) => d.avantages && setA(d.avantages)).catch(() => {}); }, [url]);
  if (!a) return <div className="bg-white rounded-xl shadow p-6 text-gray-500">Chargement des avantages…</div>;

  const maj = (x: Partial<A>) => { setEtat(null); setA({ ...a, ...x }); };
  const ajouterAutre = (l: string) => { const v = l.trim(); if (v && !a.autres.libelles.includes(v)) maj({ autres: { ...a.autres, actif: true, libelles: [...a.autres.libelles, v] } }); setNouveau(""); };
  const partEuros = a.tr.valeur && a.tr.partPatronale != null ? Math.round(a.tr.valeur * a.tr.partPatronale) / 100 : null;

  async function enregistrer() {
    const r = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a) });
    const d = await r.json().catch(() => ({}));
    setEtat(r.ok ? { ok: true, t: "✅ Enregistré" } : { ok: false, t: d.erreur || "Erreur" });
  }

  const ligne = "border rounded-xl p-4";
  const input = "border rounded-lg px-3 py-2 w-28";
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-bold">🍽️ Avantages versés chaque mois</h2>
      <p className="text-sm text-gray-500 mb-4">Ce que l&apos;entreprise verse à ses salariés tous les mois. Les montants « autres » se saisissent dans la fiche de chaque salarié.</p>
      <fieldset disabled={!modifiable} className="flex flex-col gap-3">
        <div className={ligne}>
          <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={a.tr.actif} onChange={(e) => maj({ tr: { ...a.tr, actif: e.target.checked } })} /> 🎫 Tickets restaurant (carte ou papier)</label>
          {a.tr.actif && (
            <div className="flex flex-wrap gap-4 mt-3 items-end text-sm">
              <label>Valeur d&apos;un ticket (€)<input type="number" min="0" step="0.01" className={`${input} block`} value={a.tr.valeur ?? ""} onChange={(e) => maj({ tr: { ...a.tr, valeur: e.target.value === "" ? null : Number(e.target.value) } })} /></label>
              <label>Part patronale (%)<input type="number" min="0" max="100" step="1" className={`${input} block`} value={a.tr.partPatronale ?? ""} onChange={(e) => maj({ tr: { ...a.tr, partPatronale: e.target.value === "" ? null : Number(e.target.value) } })} /></label>
              {partEuros != null && <span className="text-gray-600">Soit {partEuros.toLocaleString("fr-FR")} € employeur et {(Math.round((a.tr.valeur! - partEuros) * 100) / 100).toLocaleString("fr-FR")} € salarié par ticket.</span>}
              {partEuros != null && (a.tr.partPatronale! < 50 || a.tr.partPatronale! > 60 || partEuros > PLAFOND_TR_2026) && (
                <p className="w-full text-xs" style={{ color: "#c2410c" }}>⚠️ Pour être exonérée de cotisations, la part patronale doit être comprise entre 50 et 60 % de la valeur du titre, dans la limite du plafond annuel ({PLAFOND_TR_2026.toLocaleString("fr-FR")} € indicatif). À vérifier pour l&apos;année en cours.</p>
              )}
            </div>
          )}
        </div>
        <div className={ligne}>
          <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={a.panier.actif} onChange={(e) => maj({ panier: { ...a.panier, actif: e.target.checked } })} /> 🥪 Panier repas / prime de repas</label>
          {a.panier.actif && (
            <label className="block mt-3 text-sm">Montant par jour travaillé (€)<input type="number" min="0" step="0.01" className={`${input} block`} value={a.panier.montant ?? ""} onChange={(e) => maj({ panier: { ...a.panier, montant: e.target.value === "" ? null : Number(e.target.value) } })} /></label>
          )}
        </div>
        <div className={ligne}>
          <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={a.autres.actif} onChange={(e) => maj({ autres: { ...a.autres, actif: e.target.checked } })} /> ➕ Autres avantages mensuels (montant saisi par salarié)</label>
          {a.autres.actif && (
            <div className="mt-3 text-sm">
              <div className="flex flex-wrap gap-2 mb-2">
                {a.autres.libelles.map((l) => (
                  <span key={l} className="bg-orange-50 border border-orange-200 rounded-full px-3 py-1">{l} {modifiable && <button type="button" aria-label={`Retirer ${l}`} onClick={() => maj({ autres: { ...a.autres, libelles: a.autres.libelles.filter((x) => x !== l) } })} className="ml-1 text-red-700">✕</button>}</span>
                ))}
                {a.autres.libelles.length === 0 && <span className="text-gray-500">Aucun avantage ajouté.</span>}
              </div>
              {modifiable && (
                <div className="flex flex-wrap gap-2">
                  <input value={nouveau} onChange={(e) => setNouveau(e.target.value)} placeholder="Ex. Transport (abonnement)" className="border rounded-lg px-3 py-2" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ajouterAutre(nouveau); } }} />
                  <button type="button" onClick={() => ajouterAutre(nouveau)} className="border rounded-lg px-3 py-2 font-semibold">Ajouter</button>
                  {AUTRES_SUGGERES.filter((x) => !a.autres.libelles.includes(x)).map((x) => <button key={x} type="button" onClick={() => ajouterAutre(x)} className="text-xs underline text-gray-600">+ {x}</button>)}
                </div>
              )}
            </div>
          )}
        </div>
      </fieldset>
      {modifiable && (
        <div className="flex items-center gap-3 mt-4">
          <button type="button" onClick={enregistrer} className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold">Enregistrer les avantages</button>
          {etat && <span className="text-sm font-semibold" style={{ color: etat.ok ? "#15803d" : "#b91c1c" }}>{etat.t}</span>}
        </div>
      )}
    </div>
  );
}
