"use client";

/** Bouton « Revoir la présentation » : relance la présentation guidée de l'espace en cours */
export default function RevoirVisite({ style, texte = "▶ Présentation" }: { style?: React.CSSProperties; texte?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event("franeo:visite"))}
      style={{ background: "#ffffff", color: "#1d4ed8", border: "none", borderRadius: "999px", padding: "7px 16px", fontWeight: 700, fontSize: "14px", cursor: "pointer", ...style }}>
      {texte}
    </button>
  );
}
