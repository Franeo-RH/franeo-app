"use client";

import { useCallback, useEffect, useState } from "react";

type E = { id: string; at: string; jour: string; type: string; adresse: string | null; salarie: { prenom: string; nom: string }; entreprise: string };
const LIB: Record<string, string> = { ARRIVEE: "🟢 Arrivée", PAUSE: "☕ Pause", REPRISE: "▶️ Reprise", DEPART: "🔴 Départ" };
const iso = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d);

/** Journal (log) des pointages : admin (tous les clients) ou client (son entreprise) */
export default function JournalPointages({ admin = false }: { admin?: boolean }) {
  const [du, setDu] = useState(iso(new Date(Date.now() - 7 * 86400000)));
  const [au, setAu] = useState(iso(new Date()));
  const [entrepriseId, setEntrepriseId] = useState("");
  const [entreprises, setEntreprises] = useState<{ id: string; nom: string }[]>([]);
  const [recherche, setRecherche] = useState("");
  const [liste, setListe] = useState<E[] | null>(null);

  useEffect(() => { if (admin) fetch("/api/entreprises").then((r) => r.json()).then((d) => Array.isArray(d) && setEntreprises(d)).catch(() => {}); }, [admin]);
  const charger = useCallback(async () => {
    setListe(null);
    const q = new URLSearchParams({ du, au, ...(entrepriseId ? { entrepriseId } : {}) });
    const d = await fetch(`/api/pointages/journal?${q}`).then((r) => r.json()).catch(() => []);
    setListe(Array.isArray(d) ? d : []);
  }, [du, au, entrepriseId]);
  useEffect(() => { charger(); }, [charger]);

  const f = recherche.toLowerCase();
  const vues = (liste || []).filter((e) => !f || `${e.salarie.prenom} ${e.salarie.nom} ${e.entreprise} ${e.adresse ?? ""}`.toLowerCase().includes(f));
  function exporter() {
    const l = [["Date", "Heure", ...(admin ? ["Client"] : []), "Salarié", "Pointage", "Adresse du pointage"], ...vues.map((e) => [
      e.jour.split("-").reverse().join("/"), new Date(e.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }), ...(admin ? [e.entreprise] : []),
      `${e.salarie.prenom} ${e.salarie.nom}`, (LIB[e.type] || e.type).replace(/^\S+ /, ""), e.adresse ?? "",
    ])];
    const csv = "﻿" + l.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = `journal-pointages-${du}-${au}.csv`; a.click();
  }
  const chp = "border rounded-lg px-3 py-2 text-sm";

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl shadow p-4 flex gap-2 flex-wrap items-center">
        <span className="text-sm">Du</span><input type="date" value={du} onChange={(e) => setDu(e.target.value)} className={chp} aria-label="Du" />
        <span className="text-sm">au</span><input type="date" value={au} onChange={(e) => setAu(e.target.value)} className={chp} aria-label="Au" />
        {admin && (
          <select value={entrepriseId} onChange={(e) => setEntrepriseId(e.target.value)} className={chp} aria-label="Client">
            <option value="">Tous les clients</option>{entreprises.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
          </select>
        )}
        <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un salarié ou une adresse" className={chp} aria-label="Rechercher" />
        <button type="button" onClick={exporter} disabled={vues.length === 0} className={`${chp} font-semibold ml-auto`}>📥 Excel</button>
      </div>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="p-3">Date et heure</th>{admin && <th className="p-3">Client</th>}<th className="p-3">Salarié</th><th className="p-3">Pointage</th><th className="p-3">Adresse du pointage</th></tr></thead>
          <tbody>
            {liste === null ? <tr><td colSpan={6} className="p-6 text-center text-gray-500">Chargement…</td></tr> : vues.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-gray-500">Aucun pointage sur cette période.</td></tr> : vues.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3 whitespace-nowrap">{new Date(e.at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td>
                {admin && <td className="p-3">{e.entreprise}</td>}
                <td className="p-3 font-semibold">{e.salarie.prenom} {e.salarie.nom}</td>
                <td className="p-3">{LIB[e.type] || e.type}</td>
                <td className="p-3 text-gray-700">📍 {e.adresse ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {liste && liste.length >= 1000 && <p className="text-xs text-gray-500">Affichage limité aux 1 000 derniers pointages : réduisez la période.</p>}
    </div>
  );
}
