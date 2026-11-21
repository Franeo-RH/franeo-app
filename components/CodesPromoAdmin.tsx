"use client";

import { useEffect, useState } from "react";

type C = { id: string; code: string; type: string; valeur: number; portee: string; nbMois: number | null; actif: boolean; finValidite: string | null; maxUtilisations: number | null; utilisations: number; note: string | null; commissionPct: number | null; commissionMois: number | null; beneficiaire: string | null };
const champ = "border rounded-lg px-3 py-2 text-sm";
const VIDE = { code: "", type: "POURCENT", valeur: "", portee: "ABONNEMENTS", nbMois: "", finValidite: "", maxUtilisations: "", note: "", commissionPct: "", commissionMois: "", beneficiaire: "" };

/** Admin › Remises & parrainage › Codes promo (ex. TARTENPION = 10 %) */
export default function CodesPromoAdmin() {
  const [liste, setListe] = useState<C[]>([]);
  const [f, setF] = useState(VIDE);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const charger = () => fetch("/api/admin/codes-promo").then(async (r) => { const d = await r.json().catch(() => null); if (Array.isArray(d)) setListe(d); else if (d?.erreur) setMsg({ ok: false, t: d.erreur }); }).catch(() => {});
  useEffect(() => { charger(); }, []);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/codes-promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setMsg(r?.ok ? { ok: true, t: `Code ${d.code} créé.` } : { ok: false, t: d?.erreur || "Serveur injoignable." });
    if (r?.ok) { setF(VIDE); charger(); }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={ajouter} className="grid gap-3 items-end" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Code
          <input required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, "") })} placeholder="TARTENPION" className={`${champ} font-bold tracking-wider`} /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Type
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={champ}><option value="POURCENT">%</option><option value="MONTANT">€ par mois</option></select></label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Valeur
          <input inputMode="decimal" value={f.valeur} onChange={(e) => setF({ ...f, valeur: e.target.value })} placeholder={f.type === "POURCENT" ? "10 (vide = aucune)" : "50"} className={champ} /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Sur
          <select value={f.portee} onChange={(e) => setF({ ...f, portee: e.target.value })} className={champ}><option value="ABONNEMENTS">Abonnements et options</option><option value="TOUT">Toute la facture</option></select></label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Durée (mois)
          <input inputMode="numeric" value={f.nbMois} onChange={(e) => setF({ ...f, nbMois: e.target.value })} placeholder="vide = sans fin" className={champ} /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Valable jusqu&apos;au
          <input type="date" value={f.finValidite} onChange={(e) => setF({ ...f, finValidite: e.target.value })} className={champ} /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Utilisations max
          <input inputMode="numeric" value={f.maxUtilisations} onChange={(e) => setF({ ...f, maxUtilisations: e.target.value })} placeholder="illimité" className={champ} /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Note
          <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Salon, partenaire…" className={champ} /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Reverser (% du CA)
          <input inputMode="decimal" value={f.commissionPct} onChange={(e) => setF({ ...f, commissionPct: e.target.value })} placeholder="vide = rien" className={champ} /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">À qui
          <input value={f.beneficiaire} onChange={(e) => setF({ ...f, beneficiaire: e.target.value })} placeholder="Partenaire, apporteur…" className={champ} /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Commission pendant (mois)
          <input inputMode="numeric" value={f.commissionMois} onChange={(e) => setF({ ...f, commissionMois: e.target.value })} placeholder="vide = sans fin" className={champ} /></label>
        <button type="submit" className="bg-orange-500 text-white rounded-lg px-4 py-2 font-semibold text-sm hover:bg-orange-600">➕ Créer le code</button>
      </form>
      {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.ok ? "✅" : "❌"} {msg.t}</p>}
      {liste.length === 0 ? <p className="text-sm text-gray-500">Aucun code promo.</p> : (
        <table className="w-full text-sm text-left">
          <thead><tr className="text-gray-500 border-b"><th className="pb-2">Code</th><th className="pb-2">Remise</th><th className="pb-2">Validité</th><th className="pb-2">Utilisé</th><th className="pb-2">État</th><th /></tr></thead>
          <tbody>
            {liste.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td data-label="Code" className="py-2 font-bold tracking-wider">{c.code}{c.note && <span className="block text-xs text-gray-500 font-normal tracking-normal">{c.note}</span>}</td>
                <td data-label="Remise" className="py-2">{c.valeur > 0 ? <>{c.type === "MONTANT" ? `${c.valeur} € / mois` : `${c.valeur} %`} {c.portee === "TOUT" ? "sur toute la facture" : "sur les abonnements"} · {c.nbMois ? `${c.nbMois} mois` : "sans fin"}</> : "Pas de remise"}{c.commissionPct ? <span className="block text-xs font-semibold" style={{ color: "#7c3aed" }}>💶 {c.commissionPct} % du CA reversé{c.beneficiaire ? ` à ${c.beneficiaire}` : ""}{c.commissionMois ? ` · ${c.commissionMois} mois` : ""}</span> : null}</td>
                <td data-label="Validité" className="py-2">{c.finValidite ? `jusqu'au ${new Date(c.finValidite).toLocaleDateString("fr-FR")}` : "—"}</td>
                <td data-label="Utilisé" className="py-2">{c.utilisations}{c.maxUtilisations ? ` / ${c.maxUtilisations}` : ""}</td>
                <td data-label="État" className="py-2">
                  <button type="button" onClick={async () => { await fetch(`/api/admin/codes-promo/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actif: !c.actif }) }); charger(); }}
                    className="px-2 py-0.5 rounded-full text-xs font-semibold" style={c.actif ? { color: "#15803d", background: "#dcfce7" } : { color: "#6b7280", background: "#f3f4f6" }}>{c.actif ? "Actif" : "Suspendu"}</button>
                </td>
                <td className="py-2 text-right"><button type="button" onClick={async () => { if (confirm(`Supprimer le code ${c.code} ? Les remises déjà accordées restent.`)) { await fetch(`/api/admin/codes-promo/${c.id}`, { method: "DELETE" }); charger(); } }} className="text-red-600 font-semibold hover:underline">Supprimer</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-xs text-gray-500">Le prospect saisit le code dans le formulaire d&apos;inscription (champ « code de parrainage ») : la remise est créée à la validation de son inscription, à partir de la facture du mois suivant. Vous pouvez aussi l&apos;appliquer depuis la fiche d&apos;un client (onglet 🎁 Remises & parrainage).</p>
    </div>
  );
}
