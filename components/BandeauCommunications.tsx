"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Com = { id: string; titre: string; contenu: string; importante: boolean; createdAt: string | Date };

/** Notifications de communication sur le tableau de bord, avec bouton « J'ai lu » */
export default function BandeauCommunications({ communications }: { communications: Com[] }) {
  const router = useRouter();
  const [masquees, setMasquees] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const liste = communications.filter((c) => !masquees.includes(c.id));
  if (liste.length === 0) return null;

  async function valider(id: string) {
    setEnvoi(id);
    const res = await fetch(`/api/communications/${id}/lu`, { method: "POST" });
    setEnvoi(null);
    if (res.ok) {
      setMasquees((m) => [...m, id]);
      router.refresh();
    } else {
      alert("Impossible d'enregistrer la lecture, réessayez.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {liste.map((c) => (
        <div
          key={c.id}
          role="status"
          style={{
            background: c.importante ? "#fef2f2" : "#fff7ed",
            border: `1px solid ${c.importante ? "#fecaca" : "#fed7aa"}`,
            borderLeft: `6px solid ${c.importante ? "#dc2626" : "#f97316"}`,
            borderRadius: "14px",
            padding: "14px 16px",
            display: "flex",
            gap: "14px",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: c.importante ? "#b91c1c" : "#c2410c", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {c.importante ? "📢 Communication importante" : "📢 Nouvelle communication"} · {new Date(c.createdAt).toLocaleDateString("fr-FR")}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "16px", fontWeight: 700, color: "#111827" }}>{c.titre}</p>
            <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#374151", whiteSpace: "pre-line", lineHeight: 1.5 }}>{c.contenu}</p>
          </div>
          <button
            type="button"
            onClick={() => valider(c.id)}
            disabled={envoi === c.id}
            style={{ background: "#16a34a", color: "#ffffff", border: "none", borderRadius: "10px", padding: "10px 16px", fontWeight: 700, fontSize: "14px", cursor: "pointer", whiteSpace: "nowrap", opacity: envoi === c.id ? 0.6 : 1 }}
          >
            {envoi === c.id ? "…" : "✅ J'ai lu"}
          </button>
        </div>
      ))}
    </div>
  );
}
