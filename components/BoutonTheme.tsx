"use client";

import { useEffect, useState } from "react";

/** Bascule thème clair / thème sombre (mémorisé sur cet appareil) */
export default function BoutonTheme({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const [sombre, setSombre] = useState(false);

  useEffect(() => {
    setSombre(document.documentElement.dataset.theme === "dark");
  }, []);

  function basculer() {
    const suivant = !sombre;
    setSombre(suivant);
    document.documentElement.dataset.theme = suivant ? "dark" : "light";
    try {
      localStorage.setItem("franeo-theme", suivant ? "dark" : "light");
    } catch {
      // stockage indisponible (navigation privée) : le choix vaut pour cette visite
    }
  }

  return (
    <button type="button" onClick={basculer} className={className} style={style} aria-pressed={sombre}>
      {sombre ? "☀️ Thème clair" : "🌙 Thème sombre"}
    </button>
  );
}
