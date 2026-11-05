"use client";

import { useEffect, useState } from "react";
import CadreClient from "@/components/CadreClient";

type J = { id: string; auteur: string; action: string; detail: string; createdAt: string };

/** Paie › Journal des saisies : chaque saisie ou modification, avec la date et l'heure */
export default function JournalSaisies() {
  const [liste, setListe] = useState<J[]>([]);
  const [filtre, setFiltre] = useState("");
  useEffect(() => { fetch("/api/journal").then((r) => r.json()).then((d) => Array.isArray(d) && setListe(d)).catch(() => {}); }, []);
  const f = filtre.toLowerCase();
  const vues = liste.filter((j) => !f || `${j.auteur} ${j.action} ${j.detail}`.toLowerCase().includes(f));
  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">🕓 Journal des saisies</h1>
        <p className="text-gray-500 mt-1">Historique des saisies et modifications (variables, absences, relevés, imports, clôtures) avec la date et l&apos;heure.</p>
        <input value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder="Rechercher (salarié, action, auteur…)" className="border rounded-lg px-3 py-2 mt-4 w-full md:w-96" aria-label="Rechercher" />
      </div>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="p-3">Date et heure</th><th className="p-3">Par</th><th className="p-3">Action</th><th className="p-3">Détail</th></tr></thead>
          <tbody>
            {vues.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-gray-500">Aucune saisie enregistrée pour le moment.</td></tr> : vues.map((j) => (
              <tr key={j.id} className="border-t">
                <td className="p-3 whitespace-nowrap">{new Date(j.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="p-3">{j.auteur}</td>
                <td className="p-3 font-semibold">{j.action}</td>
                <td className="p-3">{j.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CadreClient>
  );
}
