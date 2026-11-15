"use client";

// Échange sur un devis ou une demande complémentaire : messages écrits + documents joints (devis PDF, etc.)

import { useState } from "react";
import FilMessages, { type MessageFil } from "@/components/FilMessages";
import type { PieceJointeVue } from "@/lib/devis";

const taille = (o: number) => (o < 1024 * 1024 ? `${Math.max(1, Math.round(o / 1024))} Ko` : `${(o / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`);
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,.txt,.csv";

export default function EchangeDemande({
  moi, messages, piecesJointes, urlMessages, urlPj, onChange, desactive = false, placeholder,
}: {
  moi: "ADMIN" | "CLIENT";
  messages: MessageFil[];
  piecesJointes: PieceJointeVue[];
  urlMessages: string;
  urlPj: string;
  onChange: () => void;
  desactive?: boolean;
  placeholder?: string;
}) {
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function joindre(liste: File[]) {
    setEnvoi(true); setErreur(null);
    const erreurs: string[] = [];
    for (const f of liste) {
      const fd = new FormData(); fd.append("fichier", f);
      const r = await fetch(urlPj, { method: "POST", body: fd });
      if (!r.ok) erreurs.push(`${f.name} : ${(await r.json().catch(() => ({}))).erreur || "erreur"}`);
    }
    setEnvoi(false);
    if (erreurs.length) setErreur(erreurs.join(" · "));
    onChange();
  }

  async function retirer(id: string, nom: string) {
    if (!confirm(`Retirer « ${nom} » ?`)) return;
    await fetch(`/api/pj/${id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div className="flex flex-col gap-3">
      <FilMessages
        moi={moi}
        messages={messages}
        desactive={desactive}
        placeholder={placeholder ?? (moi === "ADMIN" ? "Écrire au client…" : "Écrire à FRANEO RH…")}
        onEnvoyer={async (contenu) => {
          const res = await fetch(urlMessages, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contenu }) });
          if (res.ok) onChange();
          return res.ok;
        }}
      />

      {piecesJointes.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Documents</p>
          <div className="flex gap-2 flex-wrap">
            {piecesJointes.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 bg-gray-50 text-sm">
                <a href={`/api/pj/${p.id}`} className="font-semibold hover:text-orange-600">📄 {p.nom}</a>
                <span className="text-xs text-gray-400">{taille(p.taille)} · {p.role === "ADMIN" ? "FRANEO RH" : p.auteur} · {new Date(p.createdAt).toLocaleDateString("fr-FR")}</span>
                {(moi === "ADMIN" || p.role === moi) && !desactive && (
                  <button type="button" onClick={() => retirer(p.id, p.nom)} className="text-gray-400 hover:text-red-600" aria-label={`Retirer ${p.nom}`}>✕</button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {!desactive && (
        <label className={`self-start text-sm font-semibold inline-flex items-center gap-2 border-2 border-orange-300 text-orange-700 bg-orange-50 rounded-lg px-3 py-2 ${envoi ? "opacity-60" : "cursor-pointer hover:bg-orange-100"}`}>
          {envoi ? "Envoi…" : moi === "ADMIN" ? "📎 Déposer un document (devis PDF…)" : "📎 Joindre un document"}
          <input type="file" multiple className="hidden" accept={ACCEPT} disabled={envoi}
            onChange={async (e) => { const f = Array.from(e.target.files || []); e.target.value = ""; if (f.length) await joindre(f); }} />
        </label>
      )}
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
    </div>
  );
}
