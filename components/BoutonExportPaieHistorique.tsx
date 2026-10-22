"use client";

import { useState } from "react";

export default function BoutonExportPaieHistorique({
  moisDebut,
  anneeDebut,
  moisFin,
  anneeFin,
  categorie,
  entrepriseId,
}: {
  moisDebut: number;
  anneeDebut: number;
  moisFin: number;
  anneeFin: number;
  categorie: string;
  entrepriseId?: string;
}) {
  const [chargement, setChargement] = useState(false);

  async function handleExport() {
    setChargement(true);

    const params = new URLSearchParams({
      type: "paie",
      moisDebut: String(moisDebut),
      anneeDebut: String(anneeDebut),
      moisFin: String(moisFin),
      anneeFin: String(anneeFin),
      categorie,
      ...(entrepriseId ? { entrepriseId } : {}),
    });

    const res = await fetch(`/api/export?${params}`);

    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `paie-${moisDebut}-${anneeDebut}-${moisFin}-${anneeFin}.xlsx`;
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