"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { SOURCES_BUDDY } from "@/lib/buddy/sources-liste";

type Q = { id: string; question: string; motsCles: string[]; reponse: string | null; source: string | null; statut: string; occurrences: number; entreprisesNoms: string[]; updatedAt: string };

/** Admin › Communication › Questions Buddy : répondre aux questions que Buddy n'a pas comprises */
export default function QuestionsBuddy() {
  const [statut, setStatut] = useState("A_TRAITER");
  const [liste, setListe] = useState<Q[]>([]);
  const [brouillons, setBrouillons] = useState<Record<string, { reponse: string; motsCles: string; source: string }>>({});
  const [nouvelle, setNouvelle] = useState({ question: "", reponse: "", motsCles: "", source: "" });
  const [test, setTest] = useState("");
  const [resultatTest, setResultatTest] = useState<{ reponse: string | null; source: string | null; trouve: boolean; motsCles: string[] } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const charger = useCallback(async () => {
    const d = await fetch(`/api/buddy/questions?statut=${statut}`).then((r) => r.json()).catch(() => []);
    setListe(Array.isArray(d) ? d : []);
  }, [statut]);
  useEffect(() => { charger(); }, [charger]);

  const brouillon = (q: Q) => brouillons[q.id] ?? { reponse: q.reponse ?? "", motsCles: q.motsCles.join(", "), source: q.source ?? "" };
  async function enregistrer(q: Q, st?: string) {
    const b = brouillon(q);
    const res = await fetch(`/api/buddy/questions/${q.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(st ? { statut: st } : { reponse: b.reponse, source: b.source || null, motsCles: b.motsCles.split(",").map((x) => x.trim()).filter(Boolean) }) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? { ok: true, t: st === "IGNOREE" ? "Question ignorée" : "✅ Buddy connaît maintenant cette réponse" } : { ok: false, t: d.erreur || "Erreur" });
    charger();
  }
  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/buddy/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: nouvelle.question, reponse: nouvelle.reponse, source: nouvelle.source || null, motsCles: nouvelle.motsCles.split(",").map((x) => x.trim()).filter(Boolean) }) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? { ok: true, t: "✅ Réponse ajoutée à Buddy" } : { ok: false, t: d.erreur || "Erreur" });
    if (res.ok) { setNouvelle({ question: "", reponse: "", motsCles: "", source: "" }); charger(); }
  }
  async function tester(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/buddy/questions/tester", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: test }) });
    setResultatTest(res.ok ? await res.json() : null);
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
            <p className="text-gray-500 mt-1">Buddy exécute les demandes des clients (absences, variables, salariés, tickets…). Quand il ne comprend pas, la question arrive ici : rédigez une réponse, Buddy la donnera ensuite à toute question qui contient au moins 60 % des mots-clés. Les réponses paramétrées ici passent avant la FAQ. Au lieu d&apos;un texte figé, vous pouvez demander à Buddy de « chercher dans l&apos;app » : il lira alors l&apos;information (soldes de congés, absences, échéances…) dans l&apos;espace du client qui pose la question.</p>
            <div className="flex gap-2 mt-4 flex-wrap">
              {onglets.map(([id, l]) => <button key={id} type="button" onClick={() => setStatut(id)} className={`px-4 py-2 rounded-lg font-semibold ${statut === id ? "bg-orange-500 text-white" : "bg-gray-100"}`}>{l}</button>)}
            </div>
            {msg && <p className="text-sm font-semibold mt-3" style={{ color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.t}</p>}
          </div>

          <form onSubmit={tester} className="bg-white rounded-xl shadow p-6 flex flex-col gap-3">
            <h2 className="text-lg font-bold">🧪 Tester une question</h2>
            <div className="flex gap-2 flex-wrap">
              <input value={test} onChange={(e) => setTest(e.target.value)} placeholder="Ex : comment poser des congés ?" className="border rounded-lg px-3 py-2 flex-1 min-w-[220px]" aria-label="Question à tester" />
              <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold">Tester</button>
            </div>
            {resultatTest && (
              <div className="text-sm rounded-lg p-3 flex flex-col gap-1" style={{ background: resultatTest.trouve ? "#f0fdf4" : "#fff7ed" }}>
                {resultatTest.trouve ? (
                  <>
                    {resultatTest.reponse && <p><strong>Buddy répondra :</strong> <span style={{ whiteSpace: "pre-line" }}>{resultatTest.reponse}</span></p>}
                    {resultatTest.source && <p><strong>{resultatTest.reponse ? "Puis il cherchera dans l'app :" : "Buddy cherchera dans l'app :"}</strong> {resultatTest.source} <span className="text-gray-500">(avec les données et les droits du client qui pose la question)</span></p>}
                  </>
                ) : <>Aucune réponse paramétrée ne correspond. Mots-clés détectés : {resultatTest.motsCles.join(", ") || "—"}.</>}
              </div>
            )}
          </form>

          {statut === "REPONDUE" && (
            <form onSubmit={ajouter} className="bg-white rounded-xl shadow p-6 flex flex-col gap-3">
              <h2 className="text-lg font-bold">➕ Ajouter une réponse à Buddy</h2>
              <input value={nouvelle.question} onChange={(e) => setNouvelle({ ...nouvelle, question: e.target.value })} placeholder="Question type (ex : comment poser des congés payés)" className="border rounded-lg px-3 py-2" aria-label="Question" />
              <ChoixSource valeur={nouvelle.source} onChange={(v) => setNouvelle({ ...nouvelle, source: v })} />
              <textarea value={nouvelle.reponse} onChange={(e) => setNouvelle({ ...nouvelle, reponse: e.target.value })} rows={3} placeholder={nouvelle.source ? "Phrase d'introduction (facultatif), ex. : Voici ce que je trouve dans votre espace :" : "Réponse de Buddy"} className="border rounded-lg px-3 py-2" aria-label="Réponse" />
              <input value={nouvelle.motsCles} onChange={(e) => setNouvelle({ ...nouvelle, motsCles: e.target.value })} placeholder="Mots-clés séparés par des virgules (facultatif : sinon tirés de la question)" className="border rounded-lg px-3 py-2 text-sm" aria-label="Mots-clés" />
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
                <ChoixSource valeur={b.source} onChange={(v) => setBrouillons({ ...brouillons, [q.id]: { ...b, source: v } })} />
                <textarea value={b.reponse} onChange={(e) => setBrouillons({ ...brouillons, [q.id]: { ...b, reponse: e.target.value } })} rows={3} placeholder={b.source ? "Phrase d'introduction (facultatif)" : "Réponse que Buddy donnera…"} className="border rounded-lg px-3 py-2 text-sm" aria-label="Réponse" />
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

/** Réponse texte, ou « chercher dans l'app » : Buddy lit l'information dans l'espace du client */
function ChoixSource({ valeur, onChange }: { valeur: string; onChange: (v: string) => void }) {
  const aide = SOURCES_BUDDY.find((x) => x.code === valeur)?.aide;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2 flex-wrap text-sm">
        <button type="button" onClick={() => onChange("")} className={`px-3 py-1 rounded-full font-semibold border ${!valeur ? "bg-gray-900 text-white border-gray-900" : "bg-white"}`}>💬 Réponse écrite</button>
        <button type="button" onClick={() => onChange(valeur || "recherche")} className={`px-3 py-1 rounded-full font-semibold border ${valeur ? "bg-orange-500 text-white border-orange-500" : "bg-white"}`}>🔎 Chercher dans l&apos;app</button>
        {valeur && (
          <select value={valeur} onChange={(e) => onChange(e.target.value)} className="border rounded-lg px-2 py-1" aria-label="Où chercher">
            {SOURCES_BUDDY.map((x) => <option key={x.code} value={x.code}>{x.label}</option>)}
          </select>
        )}
      </div>
      {aide && <p className="text-xs text-gray-500">{aide} Le texte ci-dessous, s&apos;il est rempli, sert d&apos;introduction ; il est donné seul si Buddy ne trouve rien.</p>}
    </div>
  );
}
