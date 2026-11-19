"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { SOURCES_BUDDY, libelleSource } from "@/lib/buddy/sources-liste";
import { CAPACITES_BUDDY, GROUPES_CAPACITES, capacite, ressemblance } from "@/lib/buddy/catalogue";

type Q = { id: string; question: string; motsCles: string[]; reponse: string | null; source: string | null; action: string | null; statut: string; occurrences: number; entreprisesNoms: string[]; updatedAt: string };
type Faq = { id: string; question: string; reponse: string; module: string };
type Brouillon = { reponse: string; motsCles: string; source: string; action: string };

/** Mots d'une phrase (sans accents ni petits mots) pour comparer les questions */
const mots = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(" ").filter((m) => m.length > 3);

type Proposition = { cle: string; type: "action" | "reponse" | "faq"; label: string; score: number; appliquer: (b: Brouillon) => Brouillon };

/** Admin › Communication › Questions Buddy : tout ce que Buddy sait faire, et relier chaque question à une réponse ou une action */
export default function QuestionsBuddy() {
  const [statut, setStatut] = useState("A_TRAITER");
  const [liste, setListe] = useState<Q[]>([]);
  const [repondues, setRepondues] = useState<Q[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [brouillons, setBrouillons] = useState<Record<string, Brouillon>>({});
  const [nouvelle, setNouvelle] = useState({ question: "", reponse: "", motsCles: "", source: "", action: "" });
  const [test, setTest] = useState("");
  const [resultatTest, setResultatTest] = useState<{ reponse: string | null; source: string | null; action: string | null; trouve: boolean; motsCles: string[] } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const charger = useCallback(async () => {
    const [d, r, f] = await Promise.all([
      statut === "CATALOGUE" ? Promise.resolve([]) : fetch(`/api/buddy/questions?statut=${statut}`).then((x) => x.json()).catch(() => []),
      fetch("/api/buddy/questions?statut=REPONDUE").then((x) => x.json()).catch(() => []),
      fetch("/api/faq").then((x) => x.json()).catch(() => []),
    ]);
    setListe(Array.isArray(d) ? d : []);
    setRepondues(Array.isArray(r) ? r : []);
    setFaqs(Array.isArray(f) ? f : []);
  }, [statut]);
  useEffect(() => { charger(); }, [charger]);

  const brouillon = (q: Q): Brouillon => brouillons[q.id] ?? { reponse: q.reponse ?? "", motsCles: q.motsCles.join(", "), source: q.source ?? "", action: q.action ?? "" };
  const majBrouillon = (q: Q, b: Brouillon) => setBrouillons((x) => ({ ...x, [q.id]: b }));

  /** Ce à quoi la question ressemble : actions de Buddy, réponses déjà rédigées, FAQ (les 3 plus proches) */
  const propositions = useCallback((q: Q): Proposition[] => {
    const m = q.motsCles.length ? q.motsCles : mots(q.question);
    const toutes: Proposition[] = [
      ...CAPACITES_BUDDY.map((c) => ({ cle: `a-${c.id}`, type: "action" as const, label: c.label, score: ressemblance(m, [...c.motsCles, ...c.exemples.flatMap(mots)]), appliquer: (b: Brouillon) => ({ ...b, action: c.id, source: "" }) })),
      ...repondues.filter((r) => r.id !== q.id).map((r) => ({ cle: `r-${r.id}`, type: "reponse" as const, label: r.question, score: ressemblance(m, r.motsCles), appliquer: (b: Brouillon) => ({ ...b, reponse: r.reponse ?? "", source: r.source ?? "", action: r.action ?? "" }) })),
      ...faqs.map((f) => ({ cle: `f-${f.id}`, type: "faq" as const, label: f.question, score: ressemblance(m, mots(f.question)), appliquer: (b: Brouillon) => ({ ...b, reponse: f.reponse, source: "", action: "" }) })),
    ];
    return toutes.filter((p) => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  }, [repondues, faqs]);

  async function enregistrer(q: Q, st?: string) {
    const b = brouillon(q);
    const corps = st ? { statut: st } : { reponse: b.reponse, source: b.source || null, action: b.action || null, motsCles: b.motsCles.split(",").map((x) => x.trim()).filter(Boolean) };
    const res = await fetch(`/api/buddy/questions/${q.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? { ok: true, t: st === "IGNOREE" ? "Question ignorée" : "✅ Buddy connaît maintenant cette réponse" } : { ok: false, t: d.erreur || "Erreur" });
    if (res.ok) setBrouillons((x) => { const y = { ...x }; delete y[q.id]; return y; });
    charger();
  }
  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/buddy/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...nouvelle, source: nouvelle.source || null, action: nouvelle.action || null, motsCles: nouvelle.motsCles.split(",").map((x) => x.trim()).filter(Boolean) }) });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? { ok: true, t: "✅ Réponse ajoutée à Buddy" } : { ok: false, t: d.erreur || "Erreur" });
    if (res.ok) { setNouvelle({ question: "", reponse: "", motsCles: "", source: "", action: "" }); charger(); }
  }
  async function tester(e?: React.FormEvent, phrase?: string) {
    e?.preventDefault();
    const question = phrase ?? test;
    if (phrase) setTest(phrase);
    const res = await fetch("/api/buddy/questions/tester", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
    setResultatTest(res.ok ? await res.json() : null);
  }

  const relieesParAction = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of repondues) if (r.action) m.set(r.action, (m.get(r.action) ?? 0) + 1);
    return m;
  }, [repondues]);

  const onglets = [["A_TRAITER", "⏳ À traiter"], ["REPONDUE", "✅ Réponses de Buddy"], ["IGNOREE", "🙈 Ignorées"], ["CATALOGUE", "🧠 Ce que Buddy sait faire"]];

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom="" />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-4 md:p-10 flex flex-col gap-6" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-3xl font-bold">🤖 Buddy</h1>
            <p className="text-gray-500 mt-1">Buddy exécute les demandes des clients et répond à leurs questions. Quand il ne comprend pas, la question arrive dans « À traiter » : reliez-la à une action qu&apos;il sait déjà faire, à une réponse existante ou à la FAQ, ou rédigez une réponse. Il la reconnaîtra ensuite dès que 60 % de ses mots-clés sont dans la phrase.</p>
            <div className="grid gap-3 mt-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
              {[
                { n: CAPACITES_BUDDY.length, l: "actions qu'il sait faire" },
                { n: repondues.length, l: "réponses apprises" },
                { n: faqs.length, l: "questions de la FAQ" },
                { n: SOURCES_BUDDY.length, l: "recherches dans l'app" },
              ].map((k) => <div key={k.l} className="rounded-lg bg-gray-50 p-3"><p className="text-2xl font-bold">{k.n}</p><p className="text-xs text-gray-500">{k.l}</p></div>)}
            </div>
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
                    {resultatTest.action && <p><strong>Puis il lancera l&apos;action :</strong> {resultatTest.action} <span className="text-gray-500">(avec les noms et dates de la phrase)</span></p>}
                    {resultatTest.source && <p><strong>Il cherchera dans l&apos;app :</strong> {resultatTest.source}</p>}
                  </>
                ) : <>Aucune réponse paramétrée ne correspond (Buddy peut tout de même la comprendre s&apos;il s&apos;agit d&apos;une de ses actions). Mots-clés détectés : {resultatTest.motsCles.join(", ") || "—"}.</>}
              </div>
            )}
          </form>

          {statut === "CATALOGUE" && (
            <div className="flex flex-col gap-4">
              {GROUPES_CAPACITES.map((g) => (
                <section key={g} className="bg-white rounded-xl shadow p-6">
                  <h2 className="text-lg font-bold mb-3">{g}</h2>
                  <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                    {CAPACITES_BUDDY.filter((c) => c.groupe === g).map((c) => (
                      <div key={c.id} className="border rounded-lg p-3 flex flex-col gap-2">
                        <p className="font-semibold">{c.label}</p>
                        <div className="flex flex-col gap-1">
                          {c.exemples.map((ex) => <span key={ex} className="text-sm text-gray-600">« {ex} »</span>)}
                        </div>
                        <p className="text-xs text-gray-400">{relieesParAction.get(c.id) ? `🔗 ${relieesParAction.get(c.id)} question(s) reliée(s)` : "Aucune question reliée"}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
              <section className="bg-white rounded-xl shadow p-6">
                <h2 className="text-lg font-bold mb-3">🔎 Recherches dans l&apos;espace du client</h2>
                <ul className="text-sm grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                  {SOURCES_BUDDY.map((s) => <li key={s.code}><strong>{s.label}</strong><span className="block text-gray-500">{s.aide}</span></li>)}
                </ul>
              </section>
            </div>
          )}

          {statut === "REPONDUE" && (
            <form onSubmit={ajouter} className="bg-white rounded-xl shadow p-6 flex flex-col gap-3">
              <h2 className="text-lg font-bold">➕ Ajouter une réponse à Buddy</h2>
              <input value={nouvelle.question} onChange={(e) => setNouvelle({ ...nouvelle, question: e.target.value })} placeholder="Question type (ex : comment poser des congés payés)" className="border rounded-lg px-3 py-2" aria-label="Question" />
              <ChoixAction valeur={nouvelle.action} onChange={(v) => setNouvelle({ ...nouvelle, action: v, source: v ? "" : nouvelle.source })} />
              {!nouvelle.action && <ChoixSource valeur={nouvelle.source} onChange={(v) => setNouvelle({ ...nouvelle, source: v })} />}
              <textarea value={nouvelle.reponse} onChange={(e) => setNouvelle({ ...nouvelle, reponse: e.target.value })} rows={3} placeholder={nouvelle.source || nouvelle.action ? "Phrase d'introduction (facultatif)" : "Réponse de Buddy"} className="border rounded-lg px-3 py-2" aria-label="Réponse" />
              <input value={nouvelle.motsCles} onChange={(e) => setNouvelle({ ...nouvelle, motsCles: e.target.value })} placeholder="Mots-clés séparés par des virgules (facultatif : sinon tirés de la question)" className="border rounded-lg px-3 py-2 text-sm" aria-label="Mots-clés" />
              <button type="submit" className="bg-black text-white px-4 py-2 rounded-lg font-semibold self-start">Ajouter</button>
            </form>
          )}

          {statut !== "CATALOGUE" && (liste.length === 0 ? <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">{statut === "A_TRAITER" ? "Aucune question en attente. 👍" : "Rien ici pour l'instant."}</div> : liste.map((q) => {
            const b = brouillon(q);
            const props = statut !== "REPONDUE" ? propositions(q) : [];
            const lien = capacite(b.action);
            return (
              <div key={q.id} className="bg-white rounded-xl shadow p-5 flex flex-col gap-3">
                <div className="flex justify-between gap-3 flex-wrap">
                  <p className="font-bold text-lg">« {q.question} »</p>
                  <span className="text-xs text-gray-500">{q.occurrences} fois · {new Date(q.updatedAt).toLocaleDateString("fr-FR")}{q.entreprisesNoms.length ? ` · ${q.entreprisesNoms.slice(0, 3).join(", ")}` : ""}</span>
                </div>

                {props.length > 0 && (
                  <div className="rounded-lg bg-orange-50 border border-orange-100 p-3 flex flex-col gap-2">
                    <p className="text-xs font-bold text-orange-700 uppercase">💡 Ressemble à — cliquez pour relier</p>
                    <div className="flex gap-2 flex-wrap">
                      {props.map((p) => (
                        <button key={p.cle} type="button" onClick={() => majBrouillon(q, p.appliquer(b))} className="text-sm bg-white border border-orange-200 rounded-full px-3 py-1 hover:bg-orange-100 text-left">
                          {p.type === "action" ? "⚡ " : p.type === "faq" ? "❓ " : "💬 "}{p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <RelierA q={q} repondues={repondues} faqs={faqs} onChoix={(nb) => majBrouillon(q, nb(b))} />

                {lien && (
                  <p className="text-sm rounded-lg bg-green-50 text-green-800 px-3 py-2 flex justify-between gap-2 flex-wrap">
                    <span>⚡ Reliée à l&apos;action : <strong>{lien.label}</strong> — ex. « {lien.exemples[0]} »</span>
                    <button type="button" onClick={() => majBrouillon(q, { ...b, action: "" })} className="underline">Retirer le lien</button>
                  </p>
                )}
                {!b.action && <ChoixSource valeur={b.source} onChange={(v) => majBrouillon(q, { ...b, source: v })} />}
                <textarea value={b.reponse} onChange={(e) => majBrouillon(q, { ...b, reponse: e.target.value })} rows={3} placeholder={b.source || b.action ? "Phrase d'introduction (facultatif)" : "Réponse que Buddy donnera…"} className="border rounded-lg px-3 py-2 text-sm" aria-label="Réponse" />
                <label className="text-xs text-gray-600">Mots-clés (séparés par des virgules)
                  <input value={b.motsCles} onChange={(e) => majBrouillon(q, { ...b, motsCles: e.target.value })} className="border rounded-lg px-3 py-1 w-full mt-1 text-sm" />
                </label>
                <div className="flex gap-2 flex-wrap items-center">
                  <button type="button" onClick={() => enregistrer(q)} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold">💾 Enregistrer</button>
                  <button type="button" onClick={() => tester(undefined, q.question)} className="border px-4 py-2 rounded-lg">🧪 Tester</button>
                  {q.statut !== "IGNOREE" && <button type="button" onClick={() => enregistrer(q, "IGNOREE")} className="border px-4 py-2 rounded-lg">Ignorer</button>}
                  {q.statut !== "A_TRAITER" && <button type="button" onClick={() => enregistrer(q, "A_TRAITER")} className="border px-4 py-2 rounded-lg">Remettre à traiter</button>}
                  {q.statut === "REPONDUE" && <span className="text-xs text-gray-500">{q.action ? `⚡ ${capacite(q.action)?.label}` : q.source ? `🔎 ${libelleSource(q.source)}` : "💬 Réponse écrite"}</span>}
                  <button type="button" onClick={async () => { if (confirm("Supprimer ?")) { await fetch(`/api/buddy/questions/${q.id}`, { method: "DELETE" }); charger(); } }} className="text-red-600 ml-auto">🗑️</button>
                </div>
              </div>
            );
          }))}
        </main>
      </div>
    </div>
  );
}

/** Sélecteur complet : une action de Buddy, une réponse déjà rédigée, ou une question de la FAQ */
function RelierA({ q, repondues, faqs, onChoix }: { q: Q; repondues: Q[]; faqs: Faq[]; onChoix: (f: (b: Brouillon) => Brouillon) => void }) {
  return (
    <label className="text-sm font-semibold flex flex-col gap-1">
      🔗 Relier à…
      <select value="" onChange={(e) => {
        const [type, id] = e.target.value.split(":");
        if (type === "a") onChoix((b) => ({ ...b, action: id, source: "" }));
        if (type === "r") { const r = repondues.find((x) => x.id === id); if (r) onChoix((b) => ({ ...b, reponse: r.reponse ?? "", source: r.source ?? "", action: r.action ?? "" })); }
        if (type === "f") { const f = faqs.find((x) => x.id === id); if (f) onChoix((b) => ({ ...b, reponse: f.reponse, source: "", action: "" })); }
      }} className="border rounded-lg px-3 py-2 font-normal">
        <option value="">Choisir une action, une réponse existante ou une question de la FAQ…</option>
        {GROUPES_CAPACITES.map((g) => (
          <optgroup key={g} label={`⚡ ${g}`}>
            {CAPACITES_BUDDY.filter((c) => c.groupe === g).map((c) => <option key={c.id} value={`a:${c.id}`}>{c.label}</option>)}
          </optgroup>
        ))}
        {repondues.filter((r) => r.id !== q.id).length > 0 && (
          <optgroup label="💬 Réponses déjà rédigées">
            {repondues.filter((r) => r.id !== q.id).map((r) => <option key={r.id} value={`r:${r.id}`}>{r.question.slice(0, 90)}</option>)}
          </optgroup>
        )}
        {faqs.length > 0 && (
          <optgroup label="❓ FAQ">
            {faqs.map((f) => <option key={f.id} value={`f:${f.id}`}>{f.question.slice(0, 90)}</option>)}
          </optgroup>
        )}
      </select>
    </label>
  );
}

function ChoixAction({ valeur, onChange }: { valeur: string; onChange: (v: string) => void }) {
  return (
    <select value={valeur} onChange={(e) => onChange(e.target.value)} className="border rounded-lg px-3 py-2" aria-label="Action de Buddy">
      <option value="">⚡ Relier à une action de Buddy (facultatif)</option>
      {GROUPES_CAPACITES.map((g) => (
        <optgroup key={g} label={g}>
          {CAPACITES_BUDDY.filter((c) => c.groupe === g).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </optgroup>
      ))}
    </select>
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
