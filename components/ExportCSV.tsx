"use client";

/** Bouton qui télécharge un tableau en fichier Excel (CSV, séparateur « ; », accents conservés) */
export default function ExportCSV({ nom, entetes, lignes, label = "📥 Export Excel" }: { nom: string; entetes: string[]; lignes: (string | number)[][]; label?: string }) {
  function telecharger() {
    const cellule = (v: string | number) => {
      const t = typeof v === "number" ? String(v).replace(".", ",") : String(v ?? "");
      return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const contenu = "﻿" + [entetes, ...lignes].map((l) => l.map(cellule).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([contenu], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nom}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  return (
    <button type="button" onClick={telecharger} disabled={lignes.length === 0} style={{ background: "#ffffff", color: "#15803d", border: "1px solid #16a34a", borderRadius: "8px", padding: "8px 14px", fontWeight: 700, fontSize: "14px", cursor: "pointer", opacity: lignes.length === 0 ? 0.5 : 1 }}>
      {label}
    </button>
  );
}
