"use client";

import { useEffect, useState } from "react";
import { VARIABLES_EMAIL } from "@/lib/modeles-email";

type M = { id: string; nom: string; sujet: string; corps: string };

/** Admin › Communication › Modèles d'e-mails */
export default function ModelesEmailAdmin() {
  const [liste, setListe] = useState<M[]>([]);
  const [edition, setEdition] = useState<M | null>(null);
  const [msg, setMsg] = useState("");
  const charger = () => fetch("/api/admin/modeles-email").then((r) => r.json()).then((d) => Array.isArray(d) && setListe(d)).catch(() => {});
  useEffect(() => { charger(); }, []);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    if (!edition) return;
    const nouveau = !edition.id;
    const r = await fetch(nouveau ? "/api/admin/modeles-email" : `/api/admin/modeles-email/${edition.id}`, { method: nouveau ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(edition) });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? "✅ Modèle enregistré." : `❌ ${d.erreur || "Erreur"}`);
    if (r.ok) { setEdition(null); charger(); }
  }

  return (
    <div className="grid gap-6 items-start" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
      <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-2">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold">✉️ Modèles ({liste.length})</h2>
          <button type="button" onClick={() => setEdition({ id: "", nom: "", sujet: "", corps: "" })} className="bg-orange-500 text-white rounded-lg px-3 py-1.5 text-sm font-semibold">➕ Nouveau</button>
        </div>
        {liste.map((m) => (
          <div key={m.id} className={`border rounded-lg p-3 ${edition?.id === m.id ? "border-orange-400 bg-orange-50" : ""}`}>
            <div className="flex justify-between gap-2">
              <button type="button" onClick={() => setEdition(m)} className="font-semibold text-left hover:text-orange-600">{m.nom}</button>
              <button type="button" onClick={async () => { if (confirm(`Supprimer « ${m.nom} » ?`)) { await fetch(`/api/admin/modeles-email/${m.id}`, { method: "DELETE" }); charger(); } }} className="text-red-600 text-sm">🗑️</button>
            </div>
            <p className="text-xs text-gray-500 truncate">{m.sujet}</p>
          </div>
        ))}
        {msg && <p className="text-sm font-semibold">{msg}</p>}
      </div>
      <div className="bg-white rounded-xl shadow p-6">
        {!edition ? <p className="text-gray-500 text-sm">Choisissez un modèle à modifier, ou créez-en un. Pour l&apos;envoyer : ouvrez la fiche d&apos;un client › Infos › ✉️ Envoyer un e-mail.</p> : (
          <form onSubmit={enregistrer} className="flex flex-col gap-3">
            <input required value={edition.nom} onChange={(e) => setEdition({ ...edition, nom: e.target.value })} placeholder="Nom du modèle" className="border rounded-lg px-3 py-2 font-semibold" />
            <input required value={edition.sujet} onChange={(e) => setEdition({ ...edition, sujet: e.target.value })} placeholder="Objet" className="border rounded-lg px-3 py-2" />
            <textarea required rows={12} value={edition.corps} onChange={(e) => setEdition({ ...edition, corps: e.target.value })} placeholder="Message" className="border rounded-lg px-3 py-2 text-sm" />
            <p className="text-xs text-gray-500">Variables : {VARIABLES_EMAIL.map((v) => `${v.cle} (${v.aide})`).join(" · ")}</p>
            <div className="flex gap-2"><button type="submit" className="bg-orange-500 text-white rounded-lg px-4 py-2 font-semibold">💾 Enregistrer</button><button type="button" onClick={() => setEdition(null)} className="border rounded-lg px-4 py-2">Annuler</button></div>
          </form>
        )}
      </div>
    </div>
  );
}
