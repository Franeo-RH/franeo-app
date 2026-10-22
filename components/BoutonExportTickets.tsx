"use client";

import { useState } from "react";

export default function BoutonExportTickets() {
  const [chargement, setChargement] = useState(false);

  async function handleExport() {
    setChargement(true);

    const res = await fetch("/api/export?type=tickets-facturation");

    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tickets-facturation.xlsx";
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