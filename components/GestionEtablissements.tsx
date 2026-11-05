"use client";

import { useCallback, useEffect, useState } from "react";

type E = { id: string; nom: string; rue: string | null; codePostal: string | null; ville: string | null; siret: string | null };
const VIDE = { nom: "", rue: "", codePostal: "", ville: "", siret: "" };

/** Établissements de l'entreprise : ajout gratuit, au moins un avec adresse */
export default function GestionEtablissements({ modifiable }: { modifiable: boolean }) {
  const [liste, setListe] = useState<E[]>([]);
  const [form, setForm] = useState(VIDE);
  const [edition, setEdition] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const charger = useCallback(async () => {
    const d = await fetch("/api/etablissements").then((r) => r.json()).catch(() => []);
    setListe(Array.isArray(d) ? d : []);
  }, []);
  useEffect(() => { charger(); }, [charger]);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(edition ? `/api/etablissements/${edition}` : "/api/etablissements", { method: edition ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? { ok: true, t: "✅ Établissement enregistré" } : { ok: false, t: d.erreur || "Erreur" });
    if (res.ok) { setForm(VIDE); setEdition(null); setOuvert(false); charger(); }
  }
  async function supprimer(id: string) {
    if (!confirm("Supprimer cet établissement ?")) return;
    const res = await fetch(`/api/etablissements/${id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? { ok: true, t: "Établissement supprimé" } : { ok: false, t: d.erreur || "Erreur" });
    charger();
  }
  const chp = "border rounded-lg px-3 py-2 w-full";

  return (
    <div className="bg-white rounded-xl shadow p-6 col-span-2">
      <div className="flex justify-between items-center gap-3 flex-wrap mb-3">
        <div>
          <h2 className="text-lg font-bold">📍 Établissements ({liste.length})</h2>
          <p className="text-gray-500 text-sm">Ajout gratuit. Au moins un établissement avec son adresse est obligatoire. Ils servent de filtre dans les listes de salariés.</p>
        </div>
        {modifiable && !ouvert && <button type="button" onClick={() => { setForm(VIDE); setEdition(null); setOuvert(true); }} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold">➕ Ajouter un établissement</button>}
      </div>
      {liste.length === 0 && <p className="text-orange-600 font-semibold text-sm mb-3">⚠️ Aucun établissement : ajoutez votre établissement principal.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px" }}>
        {liste.map((e) => (
          <div key={e.id} className="border rounded-lg p-3 text-sm">
            <p className="font-bold">{e.nom}</p>
            <p className="text-gray-600">{e.rue}<br />{e.codePostal} {e.ville}</p>
            {e.siret && <p className="text-gray-400 text-xs">SIRET {e.siret}</p>}
            {modifiable && (
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => { setEdition(e.id); setForm({ nom: e.nom, rue: e.rue || "", codePostal: e.codePostal || "", ville: e.ville || "", siret: e.siret || "" }); setOuvert(true); }} className="text-orange-500 font-semibold">Modifier</button>
                <button type="button" onClick={() => supprimer(e.id)} className="text-red-600">Supprimer</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {ouvert && (
        <form onSubmit={enregistrer} className="grid grid-cols-2 gap-3 mt-4 border-t pt-4">
          <input required placeholder="Nom (ex : Siège, Agence de Nancy)" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className={chp} aria-label="Nom" />
          <input placeholder="SIRET (facultatif)" value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value })} className={chp} aria-label="SIRET" />
          <input required placeholder="Rue" value={form.rue} onChange={(e) => setForm({ ...form, rue: e.target.value })} className={`${chp} col-span-2`} aria-label="Rue" />
          <input required placeholder="Code postal" value={form.codePostal} onChange={(e) => setForm({ ...form, codePostal: e.target.value })} className={chp} aria-label="Code postal" />
          <input required placeholder="Ville" value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} className={chp} aria-label="Ville" />
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="bg-black text-white px-4 py-2 rounded-lg font-semibold">Enregistrer</button>
            <button type="button" onClick={() => setOuvert(false)} className="border px-4 py-2 rounded-lg">Annuler</button>
          </div>
        </form>
      )}
      {msg && <p className="text-sm font-semibold mt-2" style={{ color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.t}</p>}
    </div>
  );
}
