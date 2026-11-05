"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { appFraneo, STATUTS_DEMANDE, TYPES_DEMANDE } from "@/lib/apps-franeo";

type D = { id: string; type: string; app: string | null; options: string[]; message: string | null; remise: number; auteur: string | null; statut: string; reponse: string | null; createdAt: string; entreprise: { nom: string } };

/** Admin : demandes d'accès aux autres apps, d'audit, de formation et autres besoins */
export default function AdminDemandesServices() {
  const [liste, setListe] = useState<D[]>([]);
  const [statut, setStatut] = useState("EN_ATTENTE");
  const [reponses, setReponses] = useState<Record<string, string>>({});
  const charger = useCallback(async () => {
    const d = await fetch(`/api/demandes-services${statut ? `?statut=${statut}` : ""}`).then((r) => r.json()).catch(() => []);
    setListe(Array.isArray(d) ? d : []);
  }, [statut]);
  useEffect(() => { charger(); }, [charger]);
  async function maj(id: string, s: string) {
    const res = await fetch(`/api/demandes-services/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut: s, reponse: reponses[id] }) });
    if (!res.ok) alert((await res.json().catch(() => ({}))).erreur || "Erreur");
    charger();
  }
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom="" />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-4 md:p-10 flex flex-col gap-6" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-3xl font-bold">📱 Apps, audits & formations</h1>
            <p className="text-gray-500 mt-1">Demandes envoyées par les clients depuis « Autres apps & demandes » et « Demander un audit ».</p>
            <select value={statut} onChange={(e) => setStatut(e.target.value)} className="border rounded-lg px-3 py-2 mt-4" aria-label="Statut">
              <option value="">Tous les statuts</option>
              {Object.entries(STATUTS_DEMANDE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          {liste.length === 0 ? <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">Aucune demande.</div> : liste.map((d) => {
            const st = STATUTS_DEMANDE[d.statut] || STATUTS_DEMANDE.EN_ATTENTE;
            const app = appFraneo(d.app);
            return (
              <div key={d.id} className="bg-white rounded-xl shadow p-5 flex flex-col gap-2" style={app ? { borderLeft: `6px solid ${app.couleur}` } : undefined}>
                <div className="flex justify-between gap-3 flex-wrap">
                  <p className="font-bold text-lg">{TYPES_DEMANDE[d.type]?.icone} {TYPES_DEMANDE[d.type]?.label}{app ? ` — ${app.nom}` : ""} · {d.entreprise.nom}</p>
                  <span style={{ background: st.fond, color: st.texte, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{st.label}</span>
                </div>
                <p className="text-sm text-gray-500">{new Date(d.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })} · {d.auteur}{d.remise ? ` · remise abonné ${Math.round(d.remise * 100)} %` : ""}</p>
                {d.options.length > 0 && <p className="text-sm"><strong>Choix :</strong> {d.options.join(", ")}</p>}
                {d.message && <p className="text-sm whitespace-pre-wrap">{d.message}</p>}
                {d.reponse && <p className="text-sm bg-green-50 rounded p-2">💬 {d.reponse}</p>}
                <textarea value={reponses[d.id] ?? ""} onChange={(e) => setReponses({ ...reponses, [d.id]: e.target.value })} rows={2} placeholder="Réponse au client (facultatif)" className="border rounded-lg p-2 text-sm" aria-label="Réponse" />
                <div className="flex gap-2 flex-wrap">
                  <button type="button" onClick={() => maj(d.id, "EN_COURS")} className="bg-blue-600 text-white px-3 py-1 rounded-lg font-semibold">En cours</button>
                  <button type="button" onClick={() => maj(d.id, "TRAITEE")} className="bg-green-600 text-white px-3 py-1 rounded-lg font-semibold">Traitée</button>
                  <button type="button" onClick={() => maj(d.id, "REFUSEE")} className="bg-red-600 text-white px-3 py-1 rounded-lg font-semibold">Refuser</button>
                  <button type="button" onClick={async () => { if (confirm("Supprimer ?")) { await fetch(`/api/demandes-services/${d.id}`, { method: "DELETE" }); charger(); } }} className="text-red-600 ml-auto">🗑️</button>
                </div>
              </div>
            );
          })}
        </main>
      </div>
    </div>
  );
}
