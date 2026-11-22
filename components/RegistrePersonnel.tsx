"use client";

import { useState } from "react";
import { telechargerExcel } from "@/components/telechargerExcel";

type L = { id: string; sexe: string | null; cellules: string[] };

/** Registre unique du personnel : tableau, export Excel, impression PDF, sexe complétable en un clic */
export default function RegistrePersonnel({ entreprise, colonnes, lignes: initiales, modifiable, entrepriseId }: { entreprise: string; colonnes: string[]; lignes: L[]; modifiable: boolean; entrepriseId?: string }) {
  const [lignes, setLignes] = useState(initiales);
  const [msg, setMsg] = useState("");
  const manquants = lignes.filter((l) => !l.sexe).length;

  async function sexe(id: string, v: string) {
    const r = await fetch("/api/rup", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ salarieId: id, sexe: v }) }).catch(() => null);
    if (!r?.ok) { const d = await r?.json().catch(() => ({})); setMsg(`❌ ${d?.erreur || "Erreur"}`); return; }
    setLignes(lignes.map((l) => (l.id === id ? { ...l, sexe: v || null, cellules: l.cellules.map((c, i) => (i === 3 ? v : c)) } : l)));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap fr-pas-imprimer">
        <button type="button" onClick={() => telechargerExcel(`Registre du personnel - ${entreprise}`, colonnes, lignes.map((l) => l.cellules), { entrepriseId })} className="bg-green-700 text-white rounded-lg px-4 py-2 font-semibold">📊 Télécharger en Excel</button>
        <button type="button" onClick={() => window.print()} className="bg-orange-500 text-white rounded-lg px-4 py-2 font-semibold">🖨️ Imprimer ou enregistrer en PDF</button>
        {msg && <span className="text-sm font-semibold self-center">{msg}</span>}
      </div>
      {manquants > 0 && <p className="text-sm font-semibold fr-pas-imprimer" style={{ color: "#c2410c" }}>⚠️ Sexe à compléter pour {manquants} salarié(s) (mention obligatoire) : choisissez-le directement dans le tableau.</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead><tr>{colonnes.map((c) => <th key={c} className="border px-2 py-1 bg-orange-50">{c}</th>)}</tr></thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.id}>
                {l.cellules.map((c, i) => (
                  <td key={i} data-label={colonnes[i]} className="border px-2 py-1 align-top" style={c === "À renseigner" ? { color: "#b91c1c", fontWeight: 600 } : undefined}>
                    {i === 3 && modifiable ? (
                      <>
                        <select value={l.sexe ?? ""} onChange={(e) => sexe(l.id, e.target.value)} className="border rounded px-1 fr-pas-imprimer"><option value="">?</option><option value="F">F</option><option value="M">M</option></select>
                        <span className="hidden print:inline">{c}</span>
                      </>
                    ) : c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lignes.length === 0 && <p className="text-sm text-gray-500">Aucun salarié.</p>}
      <p className="text-xs text-gray-500">Salariés inscrits dans l&apos;ordre des embauches ; les salariés partis restent 5 ans. Pour les travailleurs étrangers, le type et le numéro du titre de travail doivent figurer au registre (gardez une copie du titre). Les stagiaires et volontaires en service civique figurent dans une partie distincte.</p>
    </div>
  );
}
