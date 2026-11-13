"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Téléphone : chaque cellule de tableau reçoit le nom de sa colonne,
 * ce qui permet d'afficher les tableaux sous forme de fiches (voir globals.css).
 * Regroupé en une passe par image (requestAnimationFrame) pour ne pas ralentir la page.
 */
export default function EtiquettesTableaux() {
  const pathname = usePathname();
  useEffect(() => {
    let attente = 0;
    function etiqueter() {
      attente = 0;
      document.querySelectorAll("main table:not(.fr-tableau-fixe)").forEach((table) => {
        const titres = Array.from(table.querySelectorAll("thead th")).map((th) => (th.textContent || "").trim());
        if (titres.length === 0) return;
        table.querySelectorAll("tbody tr").forEach((tr) => {
          Array.from(tr.children).forEach((td, i) => {
            const label = titres[i] ?? "";
            if (td.getAttribute("data-label") !== label) td.setAttribute("data-label", label);
          });
        });
      });
    }
    etiqueter();
    const obs = new MutationObserver(() => { if (!attente) attente = requestAnimationFrame(etiqueter); });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => { obs.disconnect(); if (attente) cancelAnimationFrame(attente); };
  }, [pathname]);
  return null;
}
