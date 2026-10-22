"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function BoutonExport({
  type,
  label,
}: {
  type: string;
  label?: string;
}) {
  const [chargement, setChargement] = useState(false);
  const searchParams = useSearchParams();

  async function handleExport() {
    setChargement(true);

    const params = new URLSearchParams({ type });
    searchParams.forEach((val, key) => {
      params.set(key, val);
    });

    const res = await fetch(`/api/export?${params.toString()}`);

    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}.xlsx`;
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
      {chargement ? "Export en cours..." : (label || "📊 Exporter")}
    </button>
  );
}