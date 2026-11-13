"use client";

import { useEffect, useState } from "react";
import type { AvantagesEntreprise, AvantagesSalarie as S, EstimationAvantages } from "@/lib/avantages";

const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/** Fiche salarié : bénéficie-t-il des TR / paniers, et montants des autres avantages (transport…) */
export default function AvantagesSalarie({ salarieId, modifiable = true, lienEntreprise }: { salarieId: string; modifiable?: boolean; lienEntreprise?: string }) {
  const [d, setD] = useState<{ entreprise: AvantagesEntreprise; salarie: S; estimation: EstimationAvantages } | null>(null);
  const [v, setV] = useState<{ tr: boolean; panier: boolean; joursMois: string; autres: Record<string, string> } | null>(null);
  const [etat, setEtat] = useState<{ ok: boolean; t: string } | null>(null);
  const [refus, setRefus] = useState(false);

  const appliquer = (x: { entreprise: AvantagesEntreprise; salarie: S; estimation: EstimationAvantages }) => {
    setD(x);
    setV({ tr: x.salarie.tr, panier: x.salarie.panier, joursMois: x.salarie.joursMois?.toString() ?? "", autres: Object.fromEntries(x.salarie.autres.map((a) => [a.libelle, String(a.montant)])) });
  };
  useEffect(() => {
    fetch(`/api/salaries/${salarieId}/avantages`).then(async (r) => { if (!r.ok) { setRefus(true); return; } appliquer(await r.json()); }).catch(() => setRefus(true));
  }, [salarieId]);

  if (refus) return null;
  if (!d || !v) return <div className="bg-white rounded-xl shadow p-6 text-gray-500">Chargement des avantages…</div>;
  const e = d.entreprise;
  const rien = !e.tr.actif && !e.panier.actif && !(e.autres.actif && e.autres.libelles.length);

  async function enregistrer() {
    if (!v) return;
    const corps = { tr: v.tr, panier: v.panier, joursMois: v.joursMois, autres: Object.entries(v.autres).map(([libelle, montant]) => ({ libelle, montant })) };
    const r = await fetch(`/api/salaries/${salarieId}/avantages`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { appliquer(j); setEtat({ ok: true, t: "✅ Enregistré" }); } else setEtat({ ok: false, t: j.erreur || "Erreur" });
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-bold mb-1">🍽️ Avantages mensuels</h2>
      {rien ? (
        <p className="text-sm text-gray-500">L&apos;entreprise n&apos;a déclaré aucun avantage mensuel (tickets restaurant, panier, transport…).{lienEntreprise && <> À régler dans <a href={lienEntreprise} className="underline">la fiche entreprise</a>.</>}</p>
      ) : (
        <>
          <fieldset disabled={!modifiable} className="flex flex-col gap-3 text-sm mt-3">
            {e.tr.actif && <label className="flex items-center gap-2"><input type="checkbox" checked={v.tr} onChange={(x) => { setEtat(null); setV({ ...v, tr: x.target.checked }); }} /> 🎫 Tickets restaurant ({e.tr.valeur?.toLocaleString("fr-FR")} €, {e.tr.partPatronale} % employeur)</label>}
            {e.panier.actif && <label className="flex items-center gap-2"><input type="checkbox" checked={v.panier} onChange={(x) => { setEtat(null); setV({ ...v, panier: x.target.checked }); }} /> 🥪 Panier repas ({e.panier.montant?.toLocaleString("fr-FR")} € / jour)</label>}
            {(e.tr.actif || e.panier.actif) && (
              <label className="flex items-center gap-2">Jours travaillés par mois
                <input type="number" min="0" max="31" step="0.5" placeholder="auto" value={v.joursMois} onChange={(x) => { setEtat(null); setV({ ...v, joursMois: x.target.value }); }} className="border rounded-lg px-2 py-1 w-20" />
                <span className="text-xs text-gray-500">vide = jours ouvrés du mois (absences déduites dans la masse salariale)</span>
              </label>
            )}
            {e.autres.actif && e.autres.libelles.map((l) => (
              <label key={l} className="flex items-center gap-2">{l}
                <input type="number" min="0" step="0.01" placeholder="0" value={v.autres[l] ?? ""} onChange={(x) => { setEtat(null); setV({ ...v, autres: { ...v.autres, [l]: x.target.value } }); }} className="border rounded-lg px-2 py-1 w-28" /> € / mois
              </label>
            ))}
          </fieldset>
          <div className="mt-4 rounded-lg p-3 text-sm" style={{ background: "#f9fafb" }}>
            <p className="font-semibold mb-1">Estimation du mois ({d.estimation.jours} jours)</p>
            {d.estimation.trEmployeur + d.estimation.trSalarie > 0 && <p>Tickets restaurant : {eur(d.estimation.trEmployeur)} employeur · {eur(d.estimation.trSalarie)} retenus sur le salaire</p>}
            {d.estimation.panier > 0 && <p>Paniers : {eur(d.estimation.panier)}</p>}
            {d.estimation.autres > 0 && <p>Autres : {eur(d.estimation.autres)}</p>}
            <p className="font-bold mt-1">Coût employeur : {eur(d.estimation.totalEmployeur)} / mois</p>
          </div>
          {modifiable && (
            <div className="flex items-center gap-3 mt-3">
              <button type="button" onClick={enregistrer} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold text-sm">Enregistrer</button>
              {etat && <span className="text-sm font-semibold" style={{ color: etat.ok ? "#15803d" : "#b91c1c" }}>{etat.t}</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
