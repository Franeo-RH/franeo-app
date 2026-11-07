"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { libelleChamp } from "@/lib/contrats";

type C = { id: string; intitule: string; typeContrat: string; trameNom: string | null; auteur: string; verification: boolean; createdAt: string; donnees: Record<string, string>; entreprise: { nom: string } };

/** Admin : contrats générés par les clients (avec les relectures demandées) */
export default function AdminContrats() {
  const [liste, setListe] = useState<C[]>([]);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [relecture, setRelecture] = useState(true);
  const charger = () => fetch("/api/contrats").then((r) => r.json()).then((d) => Array.isArray(d) && setListe(d)).catch(() => {});
  useEffect(() => { charger(); }, []);
  const vues = liste.filter((c) => !relecture || c.verification);
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom="" />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-4 md:p-10 flex flex-col gap-6" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-3xl font-bold">📝 Contrats générés par les clients</h1>
            <label className="flex items-center gap-2 text-sm mt-3"><input type="checkbox" checked={relecture} onChange={(e) => setRelecture(e.target.checked)} /> Seulement les relectures demandées</label>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            {vues.length === 0 ? <p className="text-gray-500 p-4 text-center">Aucun contrat.</p> : vues.map((c) => (
              <div key={c.id} className="border-b py-3">
                <button type="button" onClick={() => setOuvert(ouvert === c.id ? null : c.id)} className="w-full text-left flex justify-between gap-3 flex-wrap">
                  <span><strong>{c.entreprise.nom}</strong> — {c.intitule}<span className="block text-xs text-gray-500">{c.typeContrat} · {c.trameNom} · {c.auteur} · {new Date(c.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span></span>
                  {c.verification && <span className="text-xs font-bold text-blue-700">🔎 relecture demandée</span>}
                </button>
                {ouvert === c.id && (
                  <div className="mt-3 grid gap-x-6 gap-y-1 text-sm" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                    {Object.entries(c.donnees || {}).map(([k, v]) => <p key={k}><span className="text-gray-500">{libelleChamp(k)} :</span> {v || "—"}</p>)}
                    <button type="button" className="text-red-600 text-left" onClick={async () => { if (confirm("Supprimer ?")) { await fetch(`/api/contrats/${c.id}`, { method: "DELETE" }); charger(); } }}>🗑️ Supprimer</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
