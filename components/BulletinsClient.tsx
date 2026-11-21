"use client";

import { useEffect, useState } from "react";
import { MOIS_FR } from "@/lib/bulletins";

type B = { id: string; mois: number; annee: number; vuLe: string | null; salarie: { id: string; nom: string } };

/** Client › Paie › Bulletins : les bulletins déposés par FRANEO RH, mois par mois */
export default function BulletinsClient() {
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [liste, setListe] = useState<B[]>([]);
  useEffect(() => { fetch(`/api/bulletins?annee=${annee}`).then((r) => r.json()).then((d) => setListe(Array.isArray(d) ? d : [])).catch(() => setListe([])); }, [annee]);
  const mois = [...new Set(liste.map((b) => b.mois))].sort((a, b) => b - a);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-center">
        <button type="button" onClick={() => setAnnee(annee - 1)} className="bg-white rounded-lg shadow px-3 py-2">←</button>
        <span className="font-bold text-lg">{annee}</span>
        <button type="button" onClick={() => setAnnee(annee + 1)} className="bg-white rounded-lg shadow px-3 py-2">→</button>
      </div>
      {mois.length === 0 ? <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">Aucun bulletin déposé pour {annee}.</div> : mois.map((m) => (
        <div key={m} className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold mb-3 capitalize">{MOIS_FR[m - 1]} {annee}</h2>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {liste.filter((b) => b.mois === m).sort((a, b) => a.salarie.nom.localeCompare(b.salarie.nom)).map((b) => (
              <a key={b.id} href={`/api/bulletins/${b.id}`} target="_blank" rel="noreferrer" className="border rounded-lg px-3 py-2 hover:bg-orange-50 flex justify-between gap-2">
                <span className="font-semibold">📄 {b.salarie.nom}</span>
                <span className="text-xs text-gray-400">{b.vuLe ? "👁️ vu" : ""}</span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
