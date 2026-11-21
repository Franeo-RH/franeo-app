"use client";

export default function BoutonImprimer() {
  return <button type="button" onClick={() => window.print()} style={{ background: "#f97316", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}>🖨️ Imprimer ou enregistrer en PDF</button>;
}
