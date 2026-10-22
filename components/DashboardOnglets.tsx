"use client";

import { useState } from "react";

type GrilleMois = {
  moisNum: number;
  nomMois: string;
  montantReel: number;
  montantPrev: number;
  genere: boolean;
  facts: any[];
};

export default function DashboardOnglets({
  grilleMois,
  annee,
  moisActuel,
}: {
  grilleMois: GrilleMois[];
  annee: number;
  moisActuel: number;
}) {
  const [onglet, setOnglet] = useState<"previsionnel" | "reel">("previsionnel");

  const valeur = (m: GrilleMois) => (onglet === "reel" ? (m.genere ? m.montantReel : 0) : m.genere ? m.montantReel : m.montantPrev);
  const max = Math.max(...grilleMois.map(valeur), 1);
  const total = grilleMois.reduce((a, m) => a + valeur(m), 0);

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-bold">📊 {annee} — {Math.round(total).toLocaleString("fr-FR")} €</h2>
        <div className="flex gap-2">
          <button onClick={() => setOnglet("previsionnel")} className={`px-3 py-1 rounded-lg font-semibold text-xs ${onglet === "previsionnel" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"}`}>Prévisionnel</button>
          <button onClick={() => setOnglet("reel")} className={`px-3 py-1 rounded-lg font-semibold text-xs ${onglet === "reel" ? "bg-black text-white" : "bg-gray-100 text-gray-600"}`}>Réel</button>
        </div>
      </div>
      <div className="flex items-end gap-2 h-32">
        {grilleMois.map((m) => {
          const v = valeur(m);
          const actuel = m.moisNum === moisActuel;
          return (
            <div key={m.moisNum} className="flex-1 flex flex-col items-center justify-end h-full">
              <span className="text-[10px] text-gray-500 mb-1">{v > 0 ? `${Math.round(v).toLocaleString("fr-FR")} €` : ""}</span>
              <div
                className={`w-full rounded-t-md ${m.genere ? "bg-orange-500" : actuel ? "bg-orange-300" : "bg-gray-200"}`}
                style={{ height: `${Math.max((v / max) * 100, v > 0 ? 4 : 1)}%` }}
              />
              <span className={`text-[11px] mt-1 ${actuel ? "font-bold text-orange-500" : "text-gray-400"}`}>{["Janv","Févr","Mars","Avr","Mai","Juin","Juil","Août","Sept","Oct","Nov","Déc"][m.moisNum - 1]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
