"use client";

import { useEffect, useState } from "react";
import { remplirModele } from "@/lib/modeles-email";

type M = { id: string; nom: string; sujet: string; corps: string };
type Dest = { email: string; prenom: string };

/** Fiche client (admin) : envoyer un e-mail depuis un modèle, variables remplies, modifiable avant envoi */
export default function EnvoyerEmailClient({ entrepriseId, entreprise, destinataires, montant, lien }: { entrepriseId: string; entreprise: string; destinataires: Dest[]; montant: string; lien: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [modeles, setModeles] = useState<M[]>([]);
  const [choisis, setChoisis] = useState<string[]>(destinataires.slice(0, 1).map((d) => d.email));
  const [sujet, setSujet] = useState("");
  const [corps, setCorps] = useState("");
  const [msg, setMsg] = useState("");
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => { if (ouvert && !modeles.length) fetch("/api/admin/modeles-email").then((r) => r.json()).then((d) => Array.isArray(d) && setModeles(d)).catch(() => {}); }, [ouvert, modeles.length]);

  const vars = () => ({ prenom: destinataires.find((d) => d.email === choisis[0])?.prenom || "", entreprise, mois: new Date().toLocaleDateString("fr-FR", { month: "long" }), montant, lien });
  function appliquer(id: string) { const m = modeles.find((x) => x.id === id); if (m) { setSujet(remplirModele(m.sujet, vars())); setCorps(remplirModele(m.corps, vars())); } }
  async function envoyer() {
    setEnvoi(true); setMsg("");
    const r = await fetch("/api/admin/emails", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entrepriseId, a: choisis, sujet, corps }) });
    const d = await r.json().catch(() => ({}));
    setEnvoi(false);
    setMsg(r.ok ? `✅ E-mail envoyé (${d.envoyes}).` : `❌ ${d.erreur || "Erreur"}`);
    if (r.ok) { setSujet(""); setCorps(""); }
  }

  if (!ouvert) return <button type="button" onClick={() => setOuvert(true)} className="bg-white border-2 border-orange-400 text-orange-700 px-5 py-2 rounded-lg font-semibold hover:bg-orange-50">✉️ Envoyer un e-mail</button>;
  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-3 col-span-2" style={{ border: "2px solid #fdba74" }}>
      <div className="flex justify-between"><h2 className="text-lg font-bold">✉️ E-mail à {entreprise}</h2><button type="button" onClick={() => setOuvert(false)} className="text-gray-500">Fermer ✕</button></div>
      <select className="border rounded-lg px-3 py-2" defaultValue="" onChange={(e) => appliquer(e.target.value)}>
        <option value="">Partir d&apos;un modèle…</option>
        {modeles.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
      </select>
      <div className="flex gap-3 flex-wrap text-sm">
        {destinataires.length === 0 && <span className="text-red-600">Aucun destinataire connu pour ce client.</span>}
        {destinataires.map((d) => (
          <label key={d.email} className="flex items-center gap-1"><input type="checkbox" checked={choisis.includes(d.email)} onChange={(e) => setChoisis(e.target.checked ? [...choisis, d.email] : choisis.filter((x) => x !== d.email))} /> {d.prenom ? `${d.prenom} · ` : ""}{d.email}</label>
        ))}
      </div>
      <input value={sujet} onChange={(e) => setSujet(e.target.value)} placeholder="Objet" className="border rounded-lg px-3 py-2" />
      <textarea rows={10} value={corps} onChange={(e) => setCorps(e.target.value)} placeholder="Message" className="border rounded-lg px-3 py-2 text-sm" />
      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" disabled={envoi || !choisis.length || !sujet.trim() || !corps.trim()} onClick={envoyer} className="bg-orange-500 text-white rounded-lg px-5 py-2 font-semibold disabled:opacity-50">{envoi ? "Envoi…" : "Envoyer"}</button>
        {msg && <span className="text-sm font-semibold">{msg}</span>}
      </div>
    </div>
  );
}
