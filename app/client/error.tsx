"use client";

import { useEffect } from "react";

// Si une page plante (base de données lente, coupure réseau…), on affiche un message
// et un bouton pour réessayer au lieu d'une page à moitié vide.
export default function ErreurPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ background: "#ffffff", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", padding: "32px", maxWidth: "420px", textAlign: "center" }}>
        <p style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 8px" }}>Oups, la page n&apos;a pas pu se charger</p>
        <p style={{ color: "#6b7280", margin: "0 0 20px", fontSize: "14px" }}>
          C&apos;est souvent passager (connexion ou serveur qui se réveille). Réessayez.
        </p>
        <button
          onClick={() => reset()}
          style={{ background: "#f97316", color: "#ffffff", border: "none", borderRadius: "8px", padding: "10px 20px", fontWeight: 600, cursor: "pointer" }}
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
