"use client";

import { useCallback, useEffect, useState } from "react";

type Compte = { id: string; prenom: string; email: string; actif: boolean; etablissementId: string | null; voitSalaires: boolean; etablissement: { nom: string } | null };
type Etab = { id: string; nom: string; siret: string | null };

/** Mon entreprise : accès « dirigeant d'établissement » (il ne voit que son établissement et ses projets) */
export default function AccesEtablissements({ entrepriseId }: { entrepriseId?: string }) {
  const q = entrepriseId ? `?entrepriseId=${entrepriseId}` : "";
  const [d, setD] = useState<{ comptes: Compte[]; etablissements: Etab[] } | null>(null);
  const [refus, setRefus] = useState(false);
  const [form, setForm] = useState({ prenom: "", email: "", etablissementId: "", voitSalaires: true });
  const [ouvert, setOuvert] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [lien, setLien] = useState<{ email: string; lien: string } | null>(null);

  const charger = useCallback(() => {
    fetch(`/api/etablissements/acces${q}`).then(async (r) => { if (!r.ok) { setRefus(true); return; } setD(await r.json()); }).catch(() => setRefus(true));
  }, [q]);
  useEffect(() => { charger(); }, [charger]);

  async function appel(methode: "POST" | "PATCH" | "DELETE", corps?: Record<string, unknown>, id?: string) {
    const url = methode === "DELETE" ? `/api/etablissements/acces?id=${id}${entrepriseId ? `&entrepriseId=${entrepriseId}` : ""}` : `/api/etablissements/acces${q}`;
    const r = await fetch(url, { method: methode, headers: { "Content-Type": "application/json" }, body: corps ? JSON.stringify({ ...corps, entrepriseId }) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg({ ok: false, t: j.erreur || "Erreur" }); return null; }
    charger();
    return j;
  }

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const j = await appel("POST", form);
    if (j) {
      setLien({ email: j.email, lien: j.lien });
      setForm({ prenom: "", email: "", etablissementId: "", voitSalaires: true });
      setOuvert(false);
      setMsg({ ok: true, t: "✅ Accès créé. Envoyez le lien ci-dessous à la personne : elle choisira son mot de passe." });
    }
  }

  if (refus) return null;
  const chp = "border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none";

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex justify-between items-start gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold">🔑 Accès dirigeants d&apos;établissement</h2>
          <p className="text-sm text-gray-500 mt-1">Un dirigeant d&apos;établissement ne voit que les salariés, absences, relevés, paie et projets de son établissement. Abonnements, factures et réglages de l&apos;entreprise restent réservés au dirigeant général.</p>
        </div>
        {d && d.etablissements.length > 0 && !ouvert && (
          <button type="button" onClick={() => setOuvert(true)} className="bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-semibold">+ Créer un accès</button>
        )}
      </div>

      {msg && <p className="text-sm font-semibold mt-3" style={{ color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.t}</p>}
      {lien && (
        <div className="mt-3 rounded-lg p-3 text-sm" style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <p className="font-semibold mb-1">Lien pour {lien.email} (valable 7 jours) :</p>
          <div className="flex gap-2 flex-wrap items-center">
            <code className="break-all text-xs flex-1">{lien.lien}</code>
            <button type="button" onClick={() => navigator.clipboard?.writeText(lien.lien)} className="border rounded-lg px-3 py-1 text-xs font-semibold">Copier</button>
          </div>
        </div>
      )}

      {ouvert && d && (
        <form onSubmit={creer} className="grid gap-3 mt-4 border-t pt-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <input required placeholder="Prénom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} className={chp} aria-label="Prénom" />
          <input required type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={chp} aria-label="E-mail" />
          <select required value={form.etablissementId} onChange={(e) => setForm({ ...form, etablissementId: e.target.value })} className={chp} aria-label="Établissement">
            <option value="">Établissement…</option>
            {d.etablissements.map((e) => <option key={e.id} value={e.id}>{e.nom}{e.siret ? ` · SIRET ${e.siret}` : ""}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.voitSalaires} onChange={(e) => setForm({ ...form, voitSalaires: e.target.checked })} /> Voit les salaires
          </label>
          <div className="flex gap-2">
            <button type="submit" className="bg-black text-white rounded-lg px-4 py-2 text-sm font-semibold">Créer l&apos;accès</button>
            <button type="button" onClick={() => setOuvert(false)} className="border rounded-lg px-4 py-2 text-sm">Annuler</button>
          </div>
        </form>
      )}

      {!d ? (
        <p className="text-sm text-gray-500 mt-4">Chargement…</p>
      ) : d.comptes.length === 0 ? (
        <p className="text-sm text-gray-500 mt-4">{d.etablissements.length ? "Aucun accès d'établissement pour l'instant." : "Ajoutez d'abord vos établissements ci-dessus."}</p>
      ) : (
        <ul className="divide-y mt-4">
          {d.comptes.map((c) => (
            <li key={c.id} className="py-3 flex flex-wrap gap-3 items-center justify-between text-sm">
              <div className="min-w-0">
                <p className="font-semibold">{c.prenom} <span className="text-gray-500 font-normal">· {c.email}</span></p>
                <p className="text-gray-500">🏢 {c.etablissement?.nom ?? "—"} · {c.voitSalaires ? "voit les salaires" : "sans les salaires"} · {c.actif ? <span className="text-green-700">actif</span> : <span className="text-red-700">coupé</span>}</p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <select value={c.etablissementId ?? ""} onChange={(e) => appel("PATCH", { id: c.id, etablissementId: e.target.value })} className={chp} aria-label="Changer d'établissement">
                  {d.etablissements.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                </select>
                <button type="button" onClick={() => appel("PATCH", { id: c.id, voitSalaires: !c.voitSalaires })} className="border rounded-lg px-3 py-1">{c.voitSalaires ? "Masquer les salaires" : "Montrer les salaires"}</button>
                <button type="button" onClick={() => appel("PATCH", { id: c.id, actif: !c.actif })} className="border rounded-lg px-3 py-1">{c.actif ? "Couper" : "Réactiver"}</button>
                <button type="button" onClick={async () => { const j = await appel("PATCH", { id: c.id, nouveauLien: true }); if (j?.lien) setLien({ email: j.email, lien: j.lien }); }} className="border rounded-lg px-3 py-1">Nouveau lien</button>
                <button type="button" onClick={() => { if (confirm(`Supprimer l'accès de ${c.prenom} ?`)) appel("DELETE", undefined, c.id); }} className="text-red-600 px-2">🗑️</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
