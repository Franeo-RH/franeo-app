"use client";

/**
 * Télécharge un tableau en fichier Excel (.xlsx) avec le logo FRANEO RH et celui du client.
 * Si le serveur ne répond pas, un fichier CSV lisible par Excel est créé à la place.
 */
export async function telechargerExcel(nom: string, entetes: string[], lignes: (string | number | null | undefined)[][], opts: { entrepriseId?: string } = {}) {
  const sauver = (blob: Blob, fichier: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fichier;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };
  try {
    const res = await fetch("/api/fichier-excel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nom, lignes: [entetes, ...lignes], ...opts }) });
    if (!res.ok) throw new Error();
    sauver(await res.blob(), `${nom}.xlsx`);
  } catch {
    // Texte commençant par = + - @ : préfixé d'une apostrophe pour qu'Excel ne l'exécute jamais comme une formule
    const cellule = (v: string | number | null | undefined) => {
      let t = typeof v === "number" ? String(v).replace(".", ",") : String(v ?? "");
      if (typeof v !== "number" && /^[=+\-@\t\r]/.test(t) && !/^-?\d+([.,]\d+)?$/.test(t)) t = `'${t}`;
      return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    sauver(new Blob(["﻿" + [entetes, ...lignes].map((l) => l.map(cellule).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" }), `${nom}.csv`);
  }
}
