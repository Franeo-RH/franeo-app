"use client";

import { useState } from "react";
import Link from "next/link";

export type MessageFil = { id: string; role: string; auteur: string; contenu: string; createdAt: string; versTicket?: boolean };

/** Fil de discussion écrit (devis, demandes RH) : messages + zone de réponse */
export default function FilMessages({
  messages,
  moi,
  onEnvoyer,
  desactive = false,
  placeholder = "Votre message…",
  actionsRapides = [],
}: {
  messages: MessageFil[];
  moi: "ADMIN" | "CLIENT";
  onEnvoyer: (contenu: string, options?: { versTicket?: boolean }) => Promise<boolean>;
  desactive?: boolean;
  placeholder?: string;
  actionsRapides?: { label: string; texte: string; versTicket?: boolean }[];
}) {
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function envoyer(contenu: string, options?: { versTicket?: boolean }) {
    if (!contenu.trim()) return;
    setEnvoi(true);
    const ok = await onEnvoyer(contenu.trim(), options);
    setEnvoi(false);
    if (ok) setTexte("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {messages.length === 0 && <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>Aucun message pour le moment.</p>}
      {messages.map((m) => {
        const mien = m.role === moi;
        return (
          <div key={m.id} style={{ alignSelf: mien ? "flex-end" : "flex-start", maxWidth: "85%", background: mien ? "#fff7ed" : "#f3f4f6", border: `1px solid ${mien ? "#fed7aa" : "#e5e7eb"}`, borderRadius: "12px", padding: "8px 12px" }}>
            <p style={{ margin: 0, fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>
              {m.role === "ADMIN" ? "FRANEO RH" : m.auteur} · {new Date(m.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "14px", whiteSpace: "pre-line" }}>{m.contenu}</p>
            {m.versTicket && moi === "CLIENT" && (
              <Link href="/client/tickets/nouveau" style={{ display: "inline-block", marginTop: "6px", background: "#f97316", color: "#ffffff", borderRadius: "8px", padding: "6px 12px", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>
                🎫 Ouvrir un ticket RH
              </Link>
            )}
          </div>
        );
      })}
      {!desactive && (
        <>
          {actionsRapides.length > 0 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {actionsRapides.map((a) => (
                <button key={a.label} type="button" disabled={envoi} onClick={() => envoyer(a.texte, { versTicket: a.versTicket })}
                  style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "999px", padding: "5px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                  ⚡ {a.label}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
            <textarea value={texte} onChange={(e) => setTexte(e.target.value)} placeholder={placeholder} rows={2} maxLength={3000} aria-label="Message"
              style={{ flex: 1, minWidth: 0, border: "1px solid #d1d5db", borderRadius: "10px", padding: "8px 10px", fontSize: "15px", resize: "vertical" }} />
            <button type="button" disabled={envoi || !texte.trim()} onClick={() => envoyer(texte)}
              style={{ background: "#f97316", color: "#ffffff", border: "none", borderRadius: "10px", padding: "10px 16px", fontWeight: 700, cursor: "pointer", opacity: envoi || !texte.trim() ? 0.5 : 1 }}>
              Envoyer
            </button>
          </div>
        </>
      )}
    </div>
  );
}
