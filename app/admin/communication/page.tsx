"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { CIBLES } from "@/lib/communications-cibles";
import { BoutonExportComplet } from "@/components/OutilsAdmin";

type Lecture = { luAt: string; utilisateur: { prenom: string; email: string; role: string; entreprise: { nom: string } | null } };
type Com = {
  id: string; titre: string; contenu: string; cible: string; importante: boolean; createdAt: string;
  entreprise: { nom: string } | null; lectures: Lecture[];
};
type Entreprise = { id: string; nom: string };

const LIB_CIBLE: Record<string, string> = Object.fromEntries(CIBLES.map((c) => [c.value, c.label]));

export default function AdminCommunication() {
  const [coms, setComs] = useState<Com[]>([]);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [form, setForm] = useState({ titre: "", contenu: "", cible: "CLIENTS", entrepriseId: "", importante: false });
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState("");
  const [ouverte, setOuverte] = useState<string | null>(null);

  const charger = () => fetch("/api/communications").then((r) => r.json()).then((d) => Array.isArray(d) && setComs(d));
  useEffect(() => {
    charger();
    fetch("/api/entreprises").then((r) => r.json()).then((d) => Array.isArray(d) && setEntreprises(d));
  }, []);

  async function publier(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setMessage("");
    const res = await fetch("/api/communications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await res.json().catch(() => ({}));
    setEnvoi(false);
    if (!res.ok) { setMessage(`❌ ${d.erreur || "Erreur"}`); return; }
    setMessage("✅ Communication publiée : elle s'affiche sur les tableaux de bord concernés.");
    setForm({ titre: "", contenu: "", cible: "CLIENTS", entrepriseId: "", importante: false });
    charger();
  }

  async function supprimer(id: string) {
    if (!confirm("Retirer cette communication ? Elle disparaîtra des tableaux de bord.")) return;
    await fetch(`/api/communications/${id}`, { method: "DELETE" });
    setComs(coms.filter((c) => c.id !== id));
  }

  const champ = "w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 font-normal";
  const [filtre, setFiltre] = useState<"toutes" | "importantes" | string>("toutes");
  const visibles = coms.filter((c) => filtre === "toutes" || (filtre === "importantes" ? c.importante : c.cible === filtre));
  const lectures = coms.reduce((t, c) => t + c.lectures.length, 0);
  const derniere = coms[0] ? new Date(coms[0].createdAt).toLocaleDateString("fr-FR") : "—";
  const ciblesUtilisees = [...new Set(coms.map((c) => c.cible))];

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom="" />
      <div className="flex">
      <Sidebar role="ADMIN" />
      <main className="flex-1 p-6 md:p-10 flex flex-col gap-6" style={{ minWidth: 0 }}>
        <div className="bg-white rounded-xl shadow p-6 flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">📢 Communication</h1>
            <p className="text-gray-500 mt-1">Une information publiée s&apos;affiche sur le tableau de bord des destinataires jusqu&apos;à ce qu&apos;ils cliquent « J&apos;ai lu ».</p>
          </div>
          <BoutonExportComplet jeu="communications" label="📥 Export (communications + lectures)" />
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          {[
            { n: coms.length, l: "communications publiées", i: "📢" },
            { n: coms.filter((c) => c.importante).length, l: "importantes", i: "🔴" },
            { n: lectures, l: "lectures « J'ai lu »", i: "✅" },
            { n: derniere, l: "dernière publication", i: "🗓️" },
          ].map((k) => (
            <div key={k.l} className="bg-white rounded-xl shadow p-4">
              <p className="text-xs font-semibold text-gray-500">{k.i} {k.l}</p>
              <p className="text-2xl font-bold">{k.n}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 items-start" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
          <form onSubmit={publier} className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
            <h2 className="text-xl font-bold">✍️ Nouvelle communication</h2>
            <div className="grid gap-3 grid-cols-2">
              <label className="text-sm font-semibold">
                Destinataires
                <select className={champ} value={form.cible} onChange={(e) => setForm({ ...form, cible: e.target.value })}>
                  {CIBLES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Entreprise
                <select className={champ} value={form.entrepriseId} onChange={(e) => setForm({ ...form, entrepriseId: e.target.value })}>
                  <option value="">Toutes les entreprises</option>
                  {entreprises.map((en) => <option key={en.id} value={en.id}>{en.nom}</option>)}
                </select>
              </label>
            </div>
            <label className="text-sm font-semibold">
              Titre *
              <input className={champ} value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Ex : Fermeture du cabinet du 24 au 31 décembre" required maxLength={150} />
            </label>
            <label className="text-sm font-semibold">
              Message *
              <textarea className={`${champ} h-32 resize-y`} value={form.contenu} onChange={(e) => setForm({ ...form, contenu: e.target.value })} placeholder="Votre message…" required maxLength={3000} />
              <span className="block text-xs text-gray-400 font-normal text-right">{form.contenu.length} / 3000</span>
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={form.importante} onChange={(e) => setForm({ ...form, importante: e.target.checked })} />
              Importante (affichée en rouge, en premier)
            </label>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm font-semibold">{message}</p>
              <button type="submit" disabled={envoi} className="bg-orange-500 text-white rounded-lg px-5 py-3 font-bold hover:bg-orange-600 disabled:opacity-60">
                {envoi ? "Publication…" : "📢 Publier"}
              </button>
            </div>
          </form>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase text-gray-500">👀 Aperçu sur le tableau de bord</h2>
            <div className="rounded-xl p-4 shadow" style={{ background: form.importante ? "#fef2f2" : "#fff7ed", border: `1px solid ${form.importante ? "#fecaca" : "#fed7aa"}` }}>
              <p className="font-bold" style={{ color: form.importante ? "#b91c1c" : "#9a3412" }}>{form.importante ? "🔴 " : "📢 "}{form.titre || "Titre de votre communication"}</p>
              <p className="text-sm text-gray-700 mt-1" style={{ whiteSpace: "pre-line" }}>{form.contenu || "Votre message apparaîtra ici, tel que vos destinataires le verront."}</p>
              <p className="text-xs text-gray-500 mt-2">{LIB_CIBLE[form.cible] || form.cible} · {entreprises.find((e) => e.id === form.entrepriseId)?.nom || "Toutes les entreprises"}</p>
              <span className="inline-block mt-3 text-xs font-bold bg-white border rounded-lg px-3 py-1">J&apos;ai lu</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center gap-3 flex-wrap mb-4">
            <h2 className="text-xl font-bold">📋 Communications publiées</h2>
            <div className="flex gap-2 flex-wrap" role="tablist">
              {[{ v: "toutes", l: `Toutes (${coms.length})` }, { v: "importantes", l: "Importantes" }, ...ciblesUtilisees.map((c) => ({ v: c, l: LIB_CIBLE[c] || c }))].map((t) => (
                <button key={t.v} type="button" role="tab" aria-selected={filtre === t.v} onClick={() => setFiltre(t.v)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${filtre === t.v ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}>{t.l}</button>
              ))}
            </div>
          </div>
          {visibles.length === 0 ? (
            <p className="text-gray-500">Aucune communication.</p>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
              {visibles.map((c) => (
                <article key={c.id} className="border rounded-xl p-4 flex flex-col gap-2" style={{ borderLeft: `5px solid ${c.importante ? "#ef4444" : "#f97316"}` }}>
                  <div className="flex justify-between gap-2">
                    <p className="font-bold">{c.importante ? "🔴 " : ""}{c.titre}</p>
                    <button type="button" aria-label="Retirer" onClick={() => supprimer(c.id)} className="text-red-600 shrink-0">🗑️</button>
                  </div>
                  <div className="flex gap-2 flex-wrap text-xs font-semibold">
                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</span>
                    <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">{LIB_CIBLE[c.cible] || c.cible}</span>
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{c.entreprise?.nom || "Toutes les entreprises"}</span>
                  </div>
                  <p className="text-sm text-gray-700" style={{ whiteSpace: "pre-line", display: "-webkit-box", WebkitLineClamp: ouverte === c.id ? "unset" : 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.contenu}</p>
                  <button type="button" onClick={() => setOuverte(ouverte === c.id ? null : c.id)} className="self-start text-sm font-semibold text-green-700 hover:underline">
                    ✅ {c.lectures.length} lecture(s) {ouverte === c.id ? "▲" : "▼"}
                  </button>
                  {ouverte === c.id && (
                    <ul className="border-t pt-2 text-sm flex flex-col gap-1">
                      {c.lectures.length === 0 && <li className="text-gray-500">Personne n&apos;a encore validé.</li>}
                      {c.lectures.map((l, i) => (
                        <li key={i}>
                          {l.utilisateur.prenom} ({l.utilisateur.role === "SALARIE" ? "salarié" : "client"}{l.utilisateur.entreprise ? ` · ${l.utilisateur.entreprise.nom}` : ""}) — {new Date(l.luAt).toLocaleString("fr-FR")}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      </div>
    </div>
  );
}
