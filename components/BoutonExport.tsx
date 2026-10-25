"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Bouton d'export Excel. Reprend automatiquement les filtres de la page (mois, année, catégorie…).
 * `params` permet d'ajouter des paramètres fixes (ex. { toutes: "1" }).
 */
export default function BoutonExport({
  type,
  label,
  params: paramsFixes,
}: {
  type: string;
  label?: string;
  params?: Record<string, string>;
}) {
  const [chargement, setChargement] = useState(false);
  const searchParams = useSearchParams();

  async function handleExport() {
    setChargement(true);
    try {
      const params = new URLSearchParams();
      searchParams.forEach((val, key) => params.set(key, val));
      Object.entries(paramsFixes || {}).forEach(([k, v]) => params.set(k, v));
      params.set("type", type);

      const res = await fetch(`/api/export?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.erreur || "L'export a échoué.");
        return;
      }

      // Nom du fichier envoyé par le serveur
      const dispo = res.headers.get("Content-Disposition") || "";
      const nom = /filename="([^"]+)"/.exec(dispo)?.[1] || `${type}.xlsx`;

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nom;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("L'export a échoué. Vérifiez votre connexion.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={chargement}
      style={{ backgroundColor: "#16a34a", color: "#ffffff" }}
      className="px-5 py-2 rounded-lg font-semibold transition disabled:opacity-50 hover:opacity-90 whitespace-nowrap"
    >
      {chargement ? "Export en cours..." : (label || "📊 Exporter Excel")}
    </button>
  );
}
