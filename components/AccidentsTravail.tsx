"use client";

// Accidents du travail : liste des dossiers, prochaine échéance (DAT sous 48 h, réserves, questionnaire CPAM),
// et fiche complète en 4 étapes. Utilisé par le client (Gestion RH) et par FRANEO RH (admin).

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DECISIONS_AT, LIENS_AT, limiteDAT, limiteQuestionnaire, limiteReserves, prochaineEtape, QUESTIONS_CPAM, STATUTS_AT, TYPES_AT,
} from "@/lib/accidents";
import type { PieceJointeVue } from "@/lib/devis";

type Accident = {
  id: string; entrepriseId: string; statut: string; type: string; declarePar: string; auteur: string | null; createdAt: string;
  dateAccident: string; heure: string | null; lieu: string | null; activite: string | null; circonstances: string | null;
  siegeLesions: string | null; natureLesions: string | null; temoins: string | null; premierePersonne: string | null; soins: string | null; arret: boolean; tiers: string | null;
  connuLe: string | null; horaires: string | null; constate: string | null; registreBenins: boolean; datDate: string | null; datReference: string | null; reserves: string | null;
  questionnaireRecuLe: string | null; questionnaire: Record<string, string> | null; questionnaireEnvoyeLe: string | null;
  decision: string | null; decisionLe: string | null; repriseLe: string | null; notes: string | null;
  salarie: { id: string; prenom: string; nom: string; poste: string }; entreprise: { nom: string }; piecesJointes: PieceJointeVue[];
};

const jour = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");
const fr = (d: Date | string) => new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const jourHeure = (iso: string | null | undefined) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

function Echeance({ limite }: { limite: Date | null }) {
  if (!limite) return null;
  const ecart = limite.getTime() - Date.now();
  const jours = Math.ceil(ecart / 86400000);
  const [fond, texte, label] = ecart < 0 ? ["#fee2e2", "#b91c1c", `en retard depuis le ${fr(limite)}`] : jours <= 2 ? ["#ffedd5", "#c2410c", `avant le ${fr(limite)}`] : ["#f3f4f6", "#374151", `avant le ${fr(limite)}`];
  return <span className="text-xs font-bold rounded-full px-2 py-1 whitespace-nowrap" style={{ background: fond, color: texte }}>⏰ {label}</span>;
}

export default function AccidentsTravail({ admin = false }: { admin?: boolean }) {
  const [liste, setListe] = useState<Accident[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<"cours" | "clos" | "tous">("cours");
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [creation, setCreation] = useState(false);

  const charger = useCallback(async () => {
    const r = await fetch("/api/accidents");
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErreur(j.erreur || "Chargement impossible"); return; }
    setListe(j);
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const visibles = useMemo(() => (liste ?? []).filter((a) => filtre === "tous" || (filtre === "clos" ? a.statut === "CLOS" : a.statut !== "CLOS")), [liste, filtre]);
  const aDeclarer = (liste ?? []).filter((a) => a.statut === "A_DECLARER").length;

  if (erreur) return <div className="bg-white rounded-xl shadow p-6 text-red-700">{erreur}</div>;

  return (
    <>
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-2 items-center">
        {([["cours", "En cours"], ["clos", "Clos"], ["tous", "Tous"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setFiltre(k)} className={`px-4 py-2 rounded-lg font-semibold text-sm ${filtre === k ? "bg-orange-500 text-white" : "bg-gray-100"}`}>{l}</button>
        ))}
        {aDeclarer > 0 && <span className="text-sm font-semibold" style={{ color: "#c2410c" }}>⚠️ {aDeclarer} accident(s) à déclarer à la CPAM</span>}
        {!admin && <button type="button" onClick={() => setCreation((c) => !c)} className="ml-auto bg-black text-white px-4 py-2 rounded-lg font-semibold text-sm">➕ Déclarer un accident</button>}
      </div>

      {creation && <NouvelAccident onFini={(id) => { setCreation(false); charger(); if (id) setOuvert(id); }} />}

      {!liste ? <div className="bg-white rounded-xl shadow p-6 text-gray-500">Chargement…</div>
        : visibles.length === 0 ? <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">{filtre === "cours" ? "Aucun accident en cours. 👍" : "Aucun dossier."}</div>
        : visibles.map((a) => {
          const st = STATUTS_AT[a.statut] ?? STATUTS_AT.A_DECLARER;
          const etape = prochaineEtape(a);
          const estOuvert = ouvert === a.id;
          return (
            <div key={a.id} className="bg-white rounded-xl shadow">
              <button type="button" onClick={() => setOuvert(estOuvert ? null : a.id)} className="w-full text-left p-5 flex flex-wrap gap-3 items-center justify-between">
                <div className="min-w-0">
                  <p className="font-bold text-lg">🩹 {a.salarie.prenom} {a.salarie.nom}{admin ? <span className="text-gray-500 font-normal"> · {a.entreprise.nom}</span> : null}</p>
                  <p className="text-sm text-gray-500">{TYPES_AT[a.type]} le {new Date(a.dateAccident).toLocaleDateString("fr-FR")}{a.heure ? ` à ${a.heure}` : ""}{a.lieu ? ` · ${a.lieu}` : ""} · déclaré par {a.declarePar === "SALARIE" ? "le salarié" : a.auteur ?? "l'employeur"}</p>
                  {etape && <p className="text-sm mt-1 flex flex-wrap gap-2 items-center"><span className="font-semibold">👉 {etape.texte}</span><Echeance limite={etape.limite} /></p>}
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: st.fond, color: st.texte }}>{st.label}</span>
              </button>
              {estOuvert && <FicheAccident a={a} onChange={charger} onSupprime={() => { setOuvert(null); charger(); }} />}
            </div>
          );
        })}
    </>
  );
}

/* ═══════════ Déclaration par l'employeur ═══════════ */

function NouvelAccident({ onFini }: { onFini: (id?: string) => void }) {
  const [salaries, setSalaries] = useState<{ id: string; prenom: string; nom: string; statut: string }[]>([]);
  const [f, setF] = useState({ salarieId: "", type: "TRAVAIL", dateAccident: new Date().toISOString().slice(0, 10), heure: "", lieu: "", circonstances: "" });
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { fetch("/api/salaries").then((r) => r.json()).then((d) => Array.isArray(d) && setSalaries(d.filter((s: { statut: string }) => s.statut === "Actif").sort((x: { nom: string }, y: { nom: string }) => x.nom.localeCompare(y.nom)))).catch(() => {}); }, []);
  async function creer() {
    setMsg(null);
    const r = await fetch("/api/accidents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg(j.erreur || "Erreur"); return; }
    onFini(j.id);
  }
  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-3">
      <h2 className="text-lg font-bold">➕ Déclarer un accident</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm font-semibold md:col-span-2">Salarié
          <select value={f.salarieId} onChange={(e) => setF({ ...f, salarieId: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 font-normal">
            <option value="">— Choisir —</option>
            {salaries.map((s) => <option key={s.id} value={s.id}>{s.nom} {s.prenom}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Type
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 font-normal">
            {Object.entries(TYPES_AT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Date<input type="date" value={f.dateAccident} onChange={(e) => setF({ ...f, dateAccident: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 font-normal" /></label>
        <label className="text-sm font-semibold">Heure<input type="time" value={f.heure} onChange={(e) => setF({ ...f, heure: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 font-normal" /></label>
        <label className="text-sm font-semibold">Lieu<input value={f.lieu} onChange={(e) => setF({ ...f, lieu: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 font-normal" /></label>
      </div>
      <label className="text-sm font-semibold">Ce qui s&apos;est passé
        <textarea value={f.circonstances} onChange={(e) => setF({ ...f, circonstances: e.target.value })} rows={3} className="mt-1 w-full border rounded-lg px-3 py-2 font-normal" />
      </label>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={!f.salarieId} onClick={creer} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-40">Créer le dossier</button>
        <button type="button" onClick={() => onFini()} className="border px-4 py-2 rounded-lg">Annuler</button>
      </div>
    </div>
  );
}

/* ═══════════ Fiche d'un accident ═══════════ */

const ONGLETS = [
  { id: "accident", label: "1. L'accident" },
  { id: "dat", label: "2. Déclaration CPAM" },
  { id: "cpam", label: "3. Questionnaire CPAM" },
  { id: "suite", label: "4. Décision & suite" },
] as const;

function FicheAccident({ a, onChange, onSupprime }: { a: Accident; onChange: () => void; onSupprime: () => void }) {
  const initial = () => ({
    type: a.type, dateAccident: jour(a.dateAccident), heure: a.heure ?? "", lieu: a.lieu ?? "", activite: a.activite ?? "", circonstances: a.circonstances ?? "",
    siegeLesions: a.siegeLesions ?? "", natureLesions: a.natureLesions ?? "", temoins: a.temoins ?? "", premierePersonne: a.premierePersonne ?? "", soins: a.soins ?? "", arret: a.arret, tiers: a.tiers ?? "",
    connuLe: jourHeure(a.connuLe), horaires: a.horaires ?? "", constate: a.constate ?? "", registreBenins: a.registreBenins, datDate: jour(a.datDate), datReference: a.datReference ?? "", reserves: a.reserves ?? "",
    questionnaireRecuLe: jour(a.questionnaireRecuLe), questionnaire: { ...(a.questionnaire ?? {}) } as Record<string, string>, questionnaireEnvoyeLe: jour(a.questionnaireEnvoyeLe),
    decision: a.decision ?? "", decisionLe: jour(a.decisionLe), repriseLe: jour(a.repriseLe), notes: a.notes ?? "",
  });
  const [f, setF] = useState(initial);
  const [onglet, setOnglet] = useState<(typeof ONGLETS)[number]["id"]>(a.statut === "A_DECLARER" ? "accident" : a.statut === "DECLARE" || a.statut === "INSTRUCTION" ? "cpam" : "suite");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const modifie = JSON.stringify(f) !== JSON.stringify(initial());

  async function enregistrer(extra: Record<string, unknown> = {}) {
    setOccupe(true); setMsg(null);
    const corps = { ...f, connuLe: f.connuLe ? new Date(f.connuLe).toISOString() : null, decision: f.decision || null, constate: f.constate || null, ...extra };
    const r = await fetch(`/api/accidents/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    const j = await r.json().catch(() => ({}));
    setOccupe(false);
    setMsg(r.ok ? { ok: true, t: "✅ Enregistré" } : { ok: false, t: j.erreur || "Erreur" });
    if (r.ok) onChange();
  }

  async function joindre(fichiers: File[]) {
    for (const fi of fichiers) {
      const fd = new FormData(); fd.append("fichier", fi);
      const r = await fetch(`/api/accidents/${a.id}/pj`, { method: "POST", body: fd });
      if (!r.ok) setMsg({ ok: false, t: `${fi.name} : ${(await r.json().catch(() => ({}))).erreur || "erreur"}` });
    }
    onChange();
  }

  const champ = (k: keyof ReturnType<typeof initial>, label: string, opts: { type?: string; long?: boolean; aide?: string; large?: boolean } = {}) => (
    <label className={`text-sm font-semibold ${opts.large || opts.long ? "md:col-span-2" : ""}`}>{label}
      {opts.long
        ? <textarea value={String(f[k] ?? "")} onChange={(e) => setF({ ...f, [k]: e.target.value })} rows={3} className="mt-1 w-full border rounded-lg px-3 py-2 font-normal" />
        : <input type={opts.type ?? "text"} value={String(f[k] ?? "")} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 font-normal" />}
      {opts.aide && <span className="block text-xs font-normal text-gray-500 mt-1">{opts.aide}</span>}
    </label>
  );

  const questions = QUESTIONS_CPAM.filter((q) => !q.trajet || f.type === "TRAJET");

  return (
    <div className="border-t px-5 pb-5">
      <div className="flex gap-1 flex-wrap py-3">
        {ONGLETS.map((o) => <button key={o.id} type="button" onClick={() => setOnglet(o.id)} className={`px-3 py-2 rounded-lg text-sm font-semibold ${onglet === o.id ? "bg-gray-900 text-white" : "bg-gray-100"}`}>{o.label}</button>)}
      </div>

      {onglet === "accident" && (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-semibold">Type
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 font-normal">
              {Object.entries(TYPES_AT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">{champ("dateAccident", "Date", { type: "date" })}{champ("heure", "Heure", { type: "time" })}</div>
          {champ("lieu", "Lieu de l'accident")}
          {champ("activite", "Activité au moment de l'accident")}
          {champ("circonstances", "Circonstances détaillées", { long: true })}
          {champ("siegeLesions", "Siège des lésions", { aide: "Ex. : main droite, dos, cheville gauche" })}
          {champ("natureLesions", "Nature des lésions", { aide: "Ex. : coupure, entorse, brûlure" })}
          {champ("temoins", "Témoins (nom, coordonnées)", { long: true })}
          {champ("premierePersonne", "Première personne avisée")}
          {champ("soins", "Soins (médecin, hôpital…)")}
          {champ("tiers", "Tiers en cause (nom, assurance)", { long: true })}
          <label className="text-sm font-semibold flex items-center gap-2"><input type="checkbox" checked={f.arret} onChange={(e) => setF({ ...f, arret: e.target.checked })} /> Un arrêt de travail a été prescrit</label>
        </div>
      )}

      {onglet === "dat" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm rounded-lg p-3" style={{ background: "#eff6ff", color: "#1e3a8a" }}>
            💡 L&apos;employeur déclare l&apos;accident à la CPAM <strong>dans les 48 heures</strong> (dimanches et jours fériés non compris) après en avoir eu connaissance
            {f.connuLe ? <> : ici, <strong>avant le {fr(limiteDAT(f.connuLe))}</strong></> : null}. Des réserves motivées peuvent être émises dans les 10 jours francs suivant la déclaration
            {f.datDate ? <> (soit <strong>avant le {fr(limiteReserves(f.datDate))}</strong>)</> : null}. Pensez aussi à remettre au salarié la feuille d&apos;accident (formulaire S6201).
            {" "}<a href={LIENS_AT.dat.href} target="_blank" rel="noreferrer" className="underline font-semibold">{LIENS_AT.dat.label}</a>
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {champ("connuLe", "Connu par l'employeur le", { type: "datetime-local" })}
            {champ("horaires", "Horaires de travail ce jour-là", { aide: "Ex. : 8 h – 12 h et 13 h 30 – 17 h" })}
            <label className="text-sm font-semibold">L&apos;accident a été
              <select value={f.constate} onChange={(e) => setF({ ...f, constate: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 font-normal">
                <option value="">—</option><option value="CONSTATE">constaté par l&apos;employeur</option><option value="DECRIT">décrit par la victime</option>
              </select>
            </label>
            <label className="text-sm font-semibold flex items-center gap-2 mt-6"><input type="checkbox" checked={f.registreBenins} onChange={(e) => setF({ ...f, registreBenins: e.target.checked })} /> Inscrit au registre des accidents bénins</label>
            {champ("datDate", "DAT envoyée le", { type: "date" })}
            {champ("datReference", "Référence / n° de dossier CPAM")}
            {champ("reserves", "Réserves motivées (facultatif)", { long: true, aide: "Elles doivent porter sur les circonstances de temps et de lieu ou sur une cause étrangère au travail." })}
          </div>
        </div>
      )}

      {onglet === "cpam" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm rounded-lg p-3" style={{ background: "#eff6ff", color: "#1e3a8a" }}>
            💡 En cas de réserves ou d&apos;enquête, la CPAM envoie un questionnaire à l&apos;employeur et au salarié. Il faut y répondre <strong>dans les 20 jours francs</strong> suivant sa réception
            {f.questionnaireRecuLe ? <> (soit <strong>avant le {fr(limiteQuestionnaire(f.questionnaireRecuLe))}</strong> environ : la date exacte figure sur le questionnaire)</> : null}.
            Préparez vos réponses ici, puis recopiez-les sur le site de la CPAM. <a href={LIENS_AT.questionnaire.href} target="_blank" rel="noreferrer" className="underline font-semibold">{LIENS_AT.questionnaire.label}</a>
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {champ("questionnaireRecuLe", "Questionnaire reçu le", { type: "date" })}
            {champ("questionnaireEnvoyeLe", "Réponses envoyées le", { type: "date" })}
          </div>
          {questions.map((q, i) => (
            <label key={q.cle} className="text-sm font-semibold">{i + 1}. {q.question}
              <textarea value={f.questionnaire[q.cle] ?? ""} onChange={(e) => setF({ ...f, questionnaire: { ...f.questionnaire, [q.cle]: e.target.value } })} rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 font-normal" />
            </label>
          ))}
          <button type="button" className="self-start border rounded-lg px-3 py-2 text-sm font-semibold"
            onClick={async () => { await navigator.clipboard?.writeText(questions.map((q, i) => `${i + 1}. ${q.question}\n${f.questionnaire[q.cle] || "—"}`).join("\n\n")).catch(() => {}); setMsg({ ok: true, t: "📋 Réponses copiées" }); }}>📋 Copier toutes les réponses</button>
        </div>
      )}

      {onglet === "suite" && (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-semibold">Décision de la CPAM
            <select value={f.decision} onChange={(e) => setF({ ...f, decision: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 font-normal">
              <option value="">En attente</option>
              {Object.entries(DECISIONS_AT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          {champ("decisionLe", "Décision reçue le", { type: "date" })}
          {champ("repriseLe", "Date de reprise du travail", { type: "date" })}
          {champ("notes", "Notes", { long: true })}
        </div>
      )}

      {/* Documents du dossier */}
      <div className="mt-4 flex flex-col gap-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Documents du dossier</p>
        <div className="flex gap-2 flex-wrap">
          {a.piecesJointes.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-2 border rounded-lg px-3 py-1 bg-gray-50 text-sm">
              <a href={`/api/pj/${p.id}`} className="font-semibold">📄 {p.nom}</a>
              <button type="button" onClick={async () => { if (confirm(`Retirer « ${p.nom} » ?`)) { await fetch(`/api/pj/${p.id}`, { method: "DELETE" }); onChange(); } }} className="text-gray-400 hover:text-red-600" aria-label={`Retirer ${p.nom}`}>✕</button>
            </span>
          ))}
          <label className="text-sm font-semibold inline-flex items-center gap-2 cursor-pointer border-2 border-orange-300 text-orange-700 bg-orange-50 rounded-lg px-3 py-1">📎 Ajouter (DAT, courrier CPAM…)
            <input type="file" multiple className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={async (e) => { const l = Array.from(e.target.files || []); e.target.value = ""; if (l.length) await joindre(l); }} />
          </label>
        </div>
        <p className="text-xs text-gray-400">Ne déposez pas le certificat médical : il contient des données de santé que l&apos;employeur n&apos;a pas à conserver.</p>
      </div>

      <div className="flex gap-2 flex-wrap items-center mt-4">
        <button type="button" disabled={occupe || !modifie} onClick={() => enregistrer()} className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold disabled:opacity-40">{occupe ? "…" : "💾 Enregistrer"}</button>
        {a.statut !== "CLOS"
          ? <button type="button" disabled={occupe} onClick={() => { if (confirm("Clore ce dossier ?")) enregistrer({ clore: true }); }} className="border px-4 py-2 rounded-lg text-sm">✅ Clore le dossier</button>
          : <button type="button" disabled={occupe} onClick={() => enregistrer({ clore: false })} className="border px-4 py-2 rounded-lg text-sm">Rouvrir</button>}
        <button type="button" onClick={async () => { if (confirm("Supprimer définitivement ce dossier ?")) { await fetch(`/api/accidents/${a.id}`, { method: "DELETE" }); onSupprime(); } }} className="text-sm text-red-600 ml-auto">🗑️ Supprimer</button>
        {msg && <p className="text-sm font-semibold w-full" style={{ color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.t}</p>}
      </div>
    </div>
  );
}
