"use client";

import { useState } from "react";

export default function BoutonExportAbsences({
  entrepriseId,
  type,
  statut,
  moisDebut,
  anneeDebut,
  moisFin,
  anneeFin,
}: {
  entrepriseId: string;
  type: string;
  statut: string;
  moisDebut: number;
  anneeDebut: number;
  moisFin: number;
  anneeFin: number;
}) {
  const [chargement, setChargement] = useState(false);

  async function handleExport() {
    setChargement(true);

    const params = new URLSearchParams({
      type: "absences",
      moisDebut: String(moisDebut),
      anneeDebut: String(anneeDebut),
      moisFin: String(moisFin),
      anneeFin: String(anneeFin),
      typeAbsence: type,
      statut,
      ...(entrepriseId ? { entrepriseId } : {}),
    });

    const res = await fetch(`/api/export?${params}`);

    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `absences.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    }

    setChargement(false);
  }

  return (
    <button
      onClick={handleExport}
      disabled={chargement}
      className="bg-green-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
    >
      {chargement ? "Export..." : "📊 Exporter Excel"}
    </button>
  );
}