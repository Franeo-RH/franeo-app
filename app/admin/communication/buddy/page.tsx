"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

type Q = { id: string; question: string; motsCles: string[]; reponse: string | null; statut: string; occurrences: number; entreprisesNoms: string[]; updatedAt: string };

/** Admin › Communication › Questions Buddy : répondre aux questions que Buddy n'a pas comprises */
export default function QuestionsBuddy() {
  const [statut, setStatut] = useState("A_TRAITER");
  const [liste, setListe] = useState<Q[]>([]);
  const [brouillons, setBrouillons] = useState<Record<string, { reponse: string; motsCles: string }>>({});
  const [nouvelle, setNouvelle] = useState({ question: "", reponse: "" });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const charger = useCallback(async () => {
    const d = await fetch(`/api/buddy/questions?statut=${statut}`).then((r) => r.json()).catch(() => []);
    setListe(Array.isArray(d) ? d : []);
  }, [statut]);
  useEffect(() => { charger(); }, [charger]);

  const brouillon = (q: Q) => brouillons[q.id] ?? { reponse: q.reponse ?? "", motsCles: q.motsCles.join(", ") };
  async function enregistrer(q: Q, st?: string) {
    const b = brouillon(q);
    const res = await fetch(`/api/buddy/questions/${q.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(st ? { statut: st } : { reponse: b.reponse, motsCles: b.motsCles.split(",").map((x) => x.trim()).filter(Boolean) }) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? { ok: true, t: st === "IGNOREE" ? "Question ignorée" : "✅ Buddy connaît maintenant cette réponse" } : { ok: false, t: d.erreur || "Erreur" });
    charger();
  }
  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/buddy/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nouvelle) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? { ok: true, t: "✅ Réponse ajoutée à Buddy" } : { ok: false, t: d.erreur || "Erreur" });
    if (res.ok) { setNouvelle({ question: "", reponse: "" }); charger(); }
  }

  const onglets = [["A_TRAITER", "⏳ À traiter"], ["REPONDUE", "✅ Réponses de Buddy"], ["IGNOREE", "🙈 Ignorées"]];

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom="" />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-4 md:p-10 flex flex-col gap-6" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-3xl font-bold">🤖 Questions Buddy</h1>
            <p className="text-gray-500 mt-1">Les questions des clients que Buddy n&apos;a pas su traiter. Rédigez une réponse : Buddy la donnera ensuite à toute question qui contient au moins 60 % des mots-clés.</p>
            <div className="flex gap-2 mt-4 flex-wrap">
              {onglets.map(([id, l]) => <button key={id} type="button" onClick={() => setStatut(id)} className={`px-4 py-2 rounded-lg font-semibold ${statut === id ? "bg-orange-500 text-white" : "bg-gray-100"}`}>{l}</button>)}
            </div>
            {msg && <p className="text-sm font-semibold mt-3" style={{ color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.t}</p>}
          </div>

          {statut === "REPONDUE" && (
            <form onSubmit={ajouter} className="bg-white rounded-xl shadow p-6 flex flex-col gap-3">
              <h2 className="text-lg font-bold">➕ Ajouter une réponse à Buddy</h2>
              <input value={nouvelle.question} onChange={(e) => setNouvelle({ ...nouvelle, question: e.target.value })} placeholder="Question type (ex : comment poser des congés payés)" className="border rounded-lg px-3 py-2" aria-label="Question" />
              <textarea value={nouvelle.reponse} onChange={(e) => setNouvelle({ ...nouvelle, reponse: e.target.value })} rows={3} placeholder="Réponse de Buddy" className="border rounded-lg px-3 py-2" aria-label="Réponse" />
              <button type="submit" className="bg-black text-white px-4 py-2 rounded-lg font-semibold self-start">Ajouter</button>
            </form>
          )}

          {liste.length === 0 ? <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">{statut === "A_TRAITER" ? "Aucune question en attente. 👍" : "Rien ici pour l'instant."}</div> : liste.map((q) => {
            const b = brouillon(q);
            return (
              <div key={q.id} className="bg-white rounded-xl shadow p-5 flex flex-col gap-3">
                <div className="flex justify-between gap-3 flex-wrap">
                  <p className="font-bold text-lg">« {q.question} »</p>
                  <span className="text-xs text-gray-500">{q.occurrences} fois · {new Date(q.updatedAt).toLocaleDateString("fr-FR")}{q.entreprisesNoms.length ? ` · ${q.entreprisesNoms.slice(0, 3).join(", ")}` : ""}</span>
                </div>
                <textarea value={b.reponse} onChange={(e) => setBrouillons({ ...brouillons, [q.id]: { ...b, reponse: e.target.value } })} rows={3} placeholder="Réponse que Buddy donnera…" className="border rounded-lg px-3 py-2 text-sm" aria-label="Réponse" />
                <label className="text-xs text-gray-600">Mots-clés (séparés par des virgules)
                  <input value={b.motsCles} onChange={(e) => setBrouillons({ ...brouillons, [q.id]: { ...b, motsCles: e.target.value } })} className="border rounded-lg px-3 py-1 w-full mt-1 text-sm" />
                </label>
                <div className="flex gap-2 flex-wrap">
                  <button type="button" onClick={() => enregistrer(q)} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold">💾 Enregistrer la réponse</button>
                  {q.statut !== "IGNOREE" && <button type="button" onClick={() => enregistrer(q, "IGNOREE")} className="border px-4 py-2 rounded-lg">Ignorer</button>}
                  {q.statut !== "A_TRAITER" && <button type="button" onClick={() => enregistrer(q, "A_TRAITER")} className="border px-4 py-2 rounded-lg">Remettre à traiter</button>}
                  <button type="button" onClick={async () => { if (confirm("Supprimer ?")) { await fetch(`/api/buddy/questions/${q.id}`, { method: "DELETE" }); charger(); } }} className="text-red-600 ml-auto">🗑️</button>
                </div>
              </div>
            );
          })}
        </main>
      </div>
    </div>
  );
}
