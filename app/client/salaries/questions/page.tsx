"use client";

import { useCallback, useEffect, useState } from "react";
import CadreClient from "@/components/CadreClient";

type Q = { id: string; sujet: string; statut: string; versFraneo: boolean; auteurNom: string; destinataireNom: string; updatedAt: string; messages: { id: string; auteur: string; contenu: string; createdAt: string }[] };
const LIB: Record<string, string> = { OUVERTE: "En attente", REPONDUE: "Répondu", CLOSE: "Close" };

/** Questions posées par les salariés à leur N+1 : vue de la direction, avec réponse possible */
export default function PageQuestionsSalaries() {
  const [liste, setListe] = useState<Q[]>([]);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [texte, setTexte] = useState("");
  const charger = useCallback(async () => {
    const d = await fetch("/api/questions-internes").then((r) => r.json()).catch(() => []);
    setListe(Array.isArray(d) ? d : []);
  }, []);
  useEffect(() => { charger(); }, [charger]);
  async function envoyer(id: string, corps: object) {
    const res = await fetch(`/api/questions-internes/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    if (!res.ok) alert((await res.json().catch(() => ({}))).erreur || "Erreur");
    setTexte(""); charger();
  }
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">💬 Questions des salariés</h1>
        <p className="text-gray-500 mt-1">Questions posées par les salariés à leur manager (N+1) ou à la direction depuis leur espace. Les managers peuvent les transférer à leur propre N+1 ou à FRANEO RH.</p>
      </div>
      <div className="bg-white rounded-xl shadow p-4">
        {liste.length === 0 ? <p className="text-gray-500 p-4 text-center">Aucune question pour le moment.</p> : liste.map((q) => (
          <div key={q.id} className="border-b py-3">
            <button type="button" onClick={() => setOuverte(ouverte === q.id ? null : q.id)} className="w-full text-left flex justify-between gap-3 flex-wrap">
              <span><strong>{q.sujet}</strong><span className="block text-xs text-gray-500">{q.auteurNom} → {q.destinataireNom} · {new Date(q.updatedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span></span>
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100">{q.versFraneo ? "Chez FRANEO RH" : LIB[q.statut] || q.statut}</span>
            </button>
            {ouverte === q.id && (
              <div className="mt-3 flex flex-col gap-2">
                {q.messages.map((m) => (
                  <div key={m.id} className="bg-gray-50 rounded-lg p-3 text-sm"><p className="text-xs text-gray-500 font-semibold">{m.auteur} · {new Date(m.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</p><p className="whitespace-pre-wrap">{m.contenu}</p></div>
                ))}
                {q.statut !== "CLOSE" && !q.versFraneo && (
                  <div className="flex gap-2 flex-wrap">
                    <input value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Répondre en tant que direction…" className="border rounded-lg px-3 py-2 flex-1" aria-label="Réponse" />
                    <button type="button" disabled={!texte.trim()} onClick={() => envoyer(q.id, { contenu: texte })} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold">Répondre</button>
                    <button type="button" onClick={() => envoyer(q.id, { statut: "CLOSE" })} className="text-sm text-gray-500 underline">Clore</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </CadreClient>
  );
}
