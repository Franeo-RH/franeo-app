"use client";

import { useCallback, useEffect, useState } from "react";
import CadreClient from "@/components/CadreClient";

type F = { id: string; date: string; montant: number; motif: string; statut: string; motifRefus: string | null; traitePar: string | null; salarie: { prenom: string; nom: string } };
const COUL: Record<string, string> = { "En attente": "bg-orange-100 text-orange-700", "Validé": "bg-green-100 text-green-700", "Refusé": "bg-red-100 text-red-700" };

/** Notes de frais déclarées par les salariés : validation (devient une variable de paie), refus, suppression, extraction */
export default function PageFrais() {
  const [liste, setListe] = useState<F[]>([]);
  const [statut, setStatut] = useState("En attente");
  const charger = useCallback(async () => {
    const d = await fetch(`/api/frais${statut ? `?statut=${encodeURIComponent(statut)}` : ""}`).then((r) => r.json()).catch(() => []);
    setListe(Array.isArray(d) ? d : []);
  }, [statut]);
  useEffect(() => { charger(); }, [charger]);

  async function decider(id: string, s: "Validé" | "Refusé") {
    let motif: string | null = null;
    if (s === "Refusé") { motif = prompt("Motif du refus :"); if (motif === null) return; }
    const res = await fetch(`/api/frais/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut: s, motif }) });
    if (!res.ok) alert((await res.json().catch(() => ({}))).erreur || "Erreur");
    charger();
  }
  async function supprimer(id: string) {
    if (!confirm("Supprimer cette note de frais ?")) return;
    const res = await fetch(`/api/frais/${id}`, { method: "DELETE" });
    if (!res.ok) alert((await res.json().catch(() => ({}))).erreur || "Erreur");
    charger();
  }
  function extraire() {
    const l = [["Salarié", "Date", "Montant (€)", "Motif", "Statut", "Traité par"], ...liste.map((f) => [`${f.salarie.prenom} ${f.salarie.nom}`, new Date(f.date).toLocaleDateString("fr-FR"), String(f.montant).replace(".", ","), f.motif, f.statut, f.traitePar || ""])];
    const csv = "﻿" + l.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = "notes-de-frais.csv"; a.click();
  }
  const total = liste.reduce((a, f) => a + f.montant, 0);

  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">🧾 Notes de frais</h1>
        <p className="text-gray-500 mt-1">Déclarées par les salariés depuis leur espace. Une note validée est ajoutée aux variables de paie du mois de la dépense.</p>
        <div className="flex gap-2 mt-4 flex-wrap">
          <select value={statut} onChange={(e) => setStatut(e.target.value)} className="border rounded-lg px-3 py-2" aria-label="Statut">
            <option value="En attente">⏳ À valider</option><option value="Validé">✅ Validées</option><option value="Refusé">↩️ Refusées</option><option value="">Toutes</option>
          </select>
          <button type="button" onClick={extraire} className="border rounded-lg px-3 py-2 font-semibold">📥 Extraire (Excel)</button>
          <span className="ml-auto font-bold self-center">Total : {total.toLocaleString("fr-FR")} €</span>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="p-3">Salarié</th><th className="p-3">Date</th><th className="p-3">Montant</th><th className="p-3">Motif</th><th className="p-3">Statut</th><th className="p-3">Actions</th></tr></thead>
          <tbody>
            {liste.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-gray-500">Aucune note de frais.</td></tr> : liste.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="p-3 font-semibold">{f.salarie.prenom} {f.salarie.nom}</td>
                <td className="p-3">{new Date(f.date).toLocaleDateString("fr-FR")}</td>
                <td className="p-3 font-bold">{f.montant.toLocaleString("fr-FR")} €</td>
                <td className="p-3">{f.motif}{f.motifRefus && <span className="block text-xs text-red-600">Motif : {f.motifRefus}</span>}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${COUL[f.statut] || ""}`}>{f.statut}</span>{f.traitePar && <span className="block text-xs text-gray-400">par {f.traitePar}</span>}</td>
                <td className="p-3 flex gap-2 flex-wrap">
                  {f.statut === "En attente" && <><button type="button" onClick={() => decider(f.id, "Validé")} className="bg-green-600 text-white px-3 py-1 rounded-lg font-semibold">Valider</button><button type="button" onClick={() => decider(f.id, "Refusé")} className="bg-red-600 text-white px-3 py-1 rounded-lg font-semibold">Refuser</button></>}
                  {f.statut !== "Validé" && <button type="button" onClick={() => supprimer(f.id)} className="text-red-600" aria-label="Supprimer">🗑️</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CadreClient>
  );
}
