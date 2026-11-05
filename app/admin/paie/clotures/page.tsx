"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { NOMS_MOIS } from "@/lib/heures";

type C = { id: string; mois: number; annee: number; statut: string; auteur: string | null; updatedAt: string; entreprise: { nom: string } };
type J = { id: string; auteur: string; action: string; detail: string; createdAt: string; entreprise: { nom: string } };
const LIB: Record<string, string> = { DEMANDE_CLOTURE: "⏳ Clôture demandée", CLOTURE: "🔒 Clôturé", DEMANDE_DECLOTURE: "⏳ Réouverture demandée" };

/** Admin : demandes de clôture / réouverture des clients et journal des saisies de paie */
export default function AdminClotures() {
  const [clotures, setClotures] = useState<C[]>([]);
  const [journal, setJournal] = useState<J[]>([]);
  const [filtre, setFiltre] = useState("");
  const charger = useCallback(async () => {
    const [c, j] = await Promise.all([fetch("/api/cloture").then((r) => r.json()).catch(() => []), fetch("/api/journal").then((r) => r.json()).catch(() => [])]);
    setClotures(Array.isArray(c) ? c : []); setJournal(Array.isArray(j) ? j : []);
  }, []);
  useEffect(() => { charger(); }, [charger]);
  async function decider(id: string, decision: "accepter" | "refuser") {
    await fetch("/api/cloture", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, decision }) });
    charger();
  }
  const f = filtre.toLowerCase();
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom="" />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-4 md:p-10 flex flex-col gap-6" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-3xl font-bold">🔒 Clôtures du mois</h1>
            <p className="text-gray-500 mt-1">Les clients demandent la clôture quand toutes leurs saisies sont faites, ou la réouverture pour une correction.</p>
          </div>
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left"><tr><th className="p-3">Client</th><th className="p-3">Mois</th><th className="p-3">Statut</th><th className="p-3">Par</th><th className="p-3">Actions</th></tr></thead>
              <tbody>
                {clotures.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-gray-500">Aucune demande.</td></tr> : clotures.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3 font-semibold">{c.entreprise.nom}</td>
                    <td className="p-3">{NOMS_MOIS[c.mois - 1]} {c.annee}</td>
                    <td className="p-3">{LIB[c.statut] || c.statut}</td>
                    <td className="p-3">{c.auteur} · {new Date(c.updatedAt).toLocaleDateString("fr-FR")}</td>
                    <td className="p-3 flex gap-2">
                      {c.statut !== "CLOTURE" && <button type="button" onClick={() => decider(c.id, "accepter")} className="bg-green-600 text-white px-3 py-1 rounded-lg font-semibold">Accepter</button>}
                      <button type="button" onClick={() => decider(c.id, "refuser")} className="bg-gray-600 text-white px-3 py-1 rounded-lg font-semibold">{c.statut === "CLOTURE" ? "Rouvrir" : "Refuser"}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold">🕓 Journal des saisies (tous clients)</h2>
            <input value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder="Rechercher…" className="border rounded-lg px-3 py-2 mt-3 w-full md:w-96" aria-label="Rechercher" />
          </div>
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left"><tr><th className="p-3">Date et heure</th><th className="p-3">Client</th><th className="p-3">Par</th><th className="p-3">Action</th><th className="p-3">Détail</th></tr></thead>
              <tbody>
                {journal.filter((j) => !f || `${j.entreprise.nom} ${j.auteur} ${j.action} ${j.detail}`.toLowerCase().includes(f)).map((j) => (
                  <tr key={j.id} className="border-t">
                    <td className="p-3 whitespace-nowrap">{new Date(j.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td className="p-3">{j.entreprise.nom}</td><td className="p-3">{j.auteur}</td><td className="p-3 font-semibold">{j.action}</td><td className="p-3">{j.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
