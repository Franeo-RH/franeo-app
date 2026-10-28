"use client";

import { useCallback, useEffect, useState } from "react";
import FilMessages from "@/components/FilMessages";
import { REPONSE_TICKET, STATUTS_QUESTION, type QuestionVue } from "@/lib/questions-rh";
import { BoutonExportComplet } from "@/components/OutilsAdmin";

/** Demandes RH ponctuelles : formulaire (client) + liste avec échanges (client et admin) */
export default function ListeQuestionsRH({ admin = false }: { admin?: boolean }) {
  const [questions, setQuestions] = useState<QuestionVue[]>([]);
  const [statut, setStatut] = useState(admin ? "OUVERTE" : "");
  const [entrepriseId, setEntrepriseId] = useState("");
  const [entreprises, setEntreprises] = useState<{ id: string; nom: string }[]>([]);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [nouvelle, setNouvelle] = useState({ sujet: "", contenu: "" });
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);

  const charger = useCallback(async () => {
    const q = new URLSearchParams();
    if (statut) q.set("statut", statut);
    if (entrepriseId) q.set("entrepriseId", entrepriseId);
    const d = await fetch(`/api/questions-rh?${q}`).then((r) => r.json()).catch(() => []);
    setQuestions(Array.isArray(d) ? d : []);
  }, [statut, entrepriseId]);

  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { if (admin) fetch("/api/entreprises").then((r) => r.json()).then((d) => Array.isArray(d) && setEntreprises(d)); }, [admin]);

  async function poser(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setRetour(null);
    const res = await fetch("/api/questions-rh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nouvelle) });
    const d = await res.json().catch(() => ({}));
    setEnvoi(false);
    if (!res.ok) { setRetour({ ok: false, texte: `❌ ${d.erreur || "Erreur"}` }); return; }
    setRetour({ ok: true, texte: "✅ Question envoyée : la réponse arrivera ici." });
    setNouvelle({ sujet: "", contenu: "" });
    setOuverte(d.question?.id ?? null);
    charger();
  }

  async function changerStatut(id: string, s: "CLOSE" | "OUVERTE") {
    await fetch(`/api/questions-rh/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut: s }) });
    charger();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">💬 Demandes RH ponctuelles</h1>
        {admin && <div className="flex gap-2 flex-wrap mt-3"><BoutonExportComplet jeu="questions" label="📥 Export complet (questions + échanges)" /></div>}
        <p className="text-gray-500 mt-1">
          {admin
            ? "Questions simples des clients, incluses dans toutes les formules et non décomptées des tickets. Pour une demande plus lourde, utilisez la réponse rapide « ouvrir un ticket »."
            : "Une question simple ? Posez-la ici pour un échange rapide avec FRANEO RH. C'est inclus dans toutes les formules et ne compte pas dans vos tickets RH."}
        </p>
        {admin && (
          <div className="flex gap-2 flex-wrap mt-4">
            <select value={statut} onChange={(e) => setStatut(e.target.value)} className="border rounded-lg px-3 py-2" aria-label="Statut">
              <option value="">Tous les statuts</option>
              {Object.entries(STATUTS_QUESTION).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={entrepriseId} onChange={(e) => setEntrepriseId(e.target.value)} className="border rounded-lg px-3 py-2" aria-label="Entreprise">
              <option value="">Tous les clients</option>
              {entreprises.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
          </div>
        )}
      </div>

      {!admin && (
        <form onSubmit={poser} className="bg-white rounded-xl shadow p-6 flex flex-col gap-3">
          <h2 className="text-xl font-bold">➕ Poser une question</h2>
          <input value={nouvelle.sujet} onChange={(e) => setNouvelle({ ...nouvelle, sujet: e.target.value })} maxLength={120} placeholder="Sujet (ex : jour férié, durée du préavis…)" className="border rounded-lg px-4 py-3" aria-label="Sujet" />
          <textarea value={nouvelle.contenu} onChange={(e) => setNouvelle({ ...nouvelle, contenu: e.target.value })} required maxLength={3000} rows={3} placeholder="Votre question…" className="border rounded-lg px-4 py-3" aria-label="Question" />
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <p className="text-sm font-semibold" style={{ color: retour?.ok ? "#15803d" : "#b91c1c" }}>{retour?.texte}</p>
            <button type="submit" disabled={envoi || !nouvelle.contenu.trim()} style={{ background: "#f97316", color: "#ffffff", border: "none", borderRadius: "10px", padding: "12px 20px", fontWeight: 700, cursor: "pointer", opacity: envoi || !nouvelle.contenu.trim() ? 0.5 : 1 }}>
              {envoi ? "Envoi…" : "Envoyer ma question"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow p-4">
        {questions.length === 0 ? <p className="text-gray-500 p-4 text-center">Aucune demande{admin && statut ? " avec ce filtre" : ""}.</p> : questions.map((q) => {
          const st = STATUTS_QUESTION[q.statut] || STATUTS_QUESTION.OUVERTE;
          const dernier = q.messages[q.messages.length - 1];
          const ouvert = ouverte === q.id;
          return (
            <div key={q.id} className="border-b py-3">
              <button type="button" onClick={() => setOuverte(ouvert ? null : q.id)} className="w-full text-left flex justify-between gap-3 flex-wrap items-center">
                <span style={{ minWidth: 0 }}>
                  <strong>{q.sujet}</strong>
                  <span className="block text-xs text-gray-500">
                    {admin && q.entreprise ? `${q.entreprise.nom} · ` : ""}{q.auteur} · {new Date(q.updatedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })} · {q.messages.length} message(s)
                  </span>
                  {!ouvert && dernier && <span className="block text-sm text-gray-600 truncate" style={{ maxWidth: "640px" }}>{dernier.role === "ADMIN" ? "FRANEO RH : " : ""}{dernier.contenu}</span>}
                </span>
                <span style={{ background: st.fond, color: st.texte, borderRadius: "999px", padding: "3px 10px", fontSize: "12px", fontWeight: 700 }}>{st.label}</span>
              </button>
              {ouvert && (
                <div className="mt-3">
                  <FilMessages
                    moi={admin ? "ADMIN" : "CLIENT"}
                    messages={q.messages}
                    desactive={q.statut === "CLOSE" && !admin}
                    placeholder={admin ? "Votre réponse…" : "Répondre…"}
                    actionsRapides={admin ? [{ label: "Merci d'ouvrir un ticket", texte: REPONSE_TICKET, versTicket: true }] : []}
                    onEnvoyer={async (contenu, options) => {
                      const res = await fetch(`/api/questions-rh/${q.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contenu, versTicket: options?.versTicket }) });
                      if (res.ok) charger();
                      return res.ok;
                    }}
                  />
                  <div className="flex gap-3 mt-2">
                    {q.statut !== "CLOSE"
                      ? <button type="button" onClick={() => changerStatut(q.id, "CLOSE")} className="text-sm text-gray-500 underline">Clore la demande</button>
                      : <button type="button" onClick={() => changerStatut(q.id, "OUVERTE")} className="text-sm text-gray-500 underline">Rouvrir</button>}
                    {admin && (
                      <button type="button" onClick={async () => { if (confirm("Supprimer cette demande ?")) { await fetch(`/api/questions-rh/${q.id}`, { method: "DELETE" }); charger(); } }} className="text-sm text-red-600">🗑️ Supprimer</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
