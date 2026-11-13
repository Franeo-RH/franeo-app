"use client";

import { useState } from "react";
import { telechargerExcel } from "@/components/telechargerExcel";

/** Bouton qui télécharge un tableau en fichier Excel (.xlsx avec le logo FRANEO RH et celui du client) */
export default function ExportCSV({ nom, entetes, lignes, label = "📥 Export Excel" }: { nom: string; entetes: string[]; lignes: (string | number)[][]; label?: string }) {
  const [charge, setCharge] = useState(false);
  return (
    <button type="button" onClick={async () => { setCharge(true); await telechargerExcel(nom, entetes, lignes); setCharge(false); }} disabled={lignes.length === 0 || charge} style={{ background: "#ffffff", color: "#15803d", border: "1px solid #16a34a", borderRadius: "8px", padding: "8px 14px", fontWeight: 700, fontSize: "14px", cursor: "pointer", opacity: lignes.length === 0 || charge ? 0.5 : 1 }}>
      {charge ? "Export…" : label}
    </button>
  );
}
