const STYLES: Record<string, { fond: string; texte: string; label: string }> = {
  EN_ATTENTE: { fond: "#fff7ed", texte: "#c2410c", label: "En attente" },
  VALIDEE: { fond: "#dcfce7", texte: "#15803d", label: "Validée" },
  REFUSEE: { fond: "#fee2e2", texte: "#b91c1c", label: "Refusée" },
};

export default function StatutDemande({ statut }: { statut: string }) {
  const s = STYLES[statut] || { fond: "#f3f4f6", texte: "#374151", label: statut };
  return (
    <span style={{ background: s.fond, color: s.texte, padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}
