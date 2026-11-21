"use client";

import { useEffect, useState } from "react";
import { MOIS_FR } from "@/lib/bulletins";

/** Espace salarié › Mes bulletins de paie */
export default function MesBulletins() {
  const [liste, setListe] = useState<{ id: string; mois: number; annee: number; vuLe: string | null }[] | null>(null);
  useEffect(() => { fetch("/api/espace-salarie/bulletins").then((r) => r.json()).then((d) => setListe(Array.isArray(d) ? d : [])).catch(() => setListe([])); }, []);
  if (!liste) return <p className="text-gray-500">Chargement…</p>;
  if (liste.length === 0) return <div className="bg-white rounded-2xl shadow p-6 text-gray-500">Aucun bulletin pour l&apos;instant. Ils apparaissent ici dès que FRANEO RH les dépose, et vous recevez un e-mail.</div>;
  return (
    <div className="bg-white rounded-2xl shadow p-4 flex flex-col">
      {liste.map((b) => (
        <a key={b.id} href={`/api/bulletins/${b.id}`} target="_blank" rel="noreferrer" className="flex justify-between items-center gap-3 py-3 px-2 border-b last:border-0 hover:bg-orange-50 rounded-lg">
          <span className="font-semibold capitalize">📄 {MOIS_FR[b.mois - 1]} {b.annee}</span>
          <span className="text-sm text-orange-600 font-semibold">{b.vuLe ? "Ouvrir" : "🆕 Nouveau"} →</span>
        </a>
      ))}
    </div>
  );
}
