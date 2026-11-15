"use client";

// Message affiché à l'admin après la création d'un accès client ou l'envoi d'un lien d'activation.
// Le mot de passe n'est jamais visible : seul le client le choisit. Si l'e-mail n'a pas pu partir,
// le lien est proposé pour être transmis autrement (il reste à usage unique).

import { useState } from "react";

export type Activation = { email: string; mailEnvoye: boolean; lien: string | null };

export default function ResultatActivation({ r }: { r: Activation }) {
  const [copie, setCopie] = useState(false);
  if (r.mailEnvoye) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 text-green-800 p-4 text-sm">
        📧 E-mail d'activation envoyé à <strong>{r.email}</strong>. Le client choisit lui-même son mot de passe (lien valable 7 jours).
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-4 text-sm flex flex-col gap-2">
      <p>⚠️ L'accès de <strong>{r.email}</strong> est créé, mais l'e-mail n'a pas pu partir (vérifiez <code>RESEND_API_KEY</code>). Transmettez-lui ce lien pour qu'il choisisse son mot de passe :</p>
      {r.lien && (
        <div className="flex gap-2">
          <input readOnly value={r.lien} className="flex-1 border rounded px-2 py-1 bg-white text-xs" onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className="border rounded px-3 py-1 bg-white font-semibold" onClick={() => { navigator.clipboard?.writeText(r.lien!).then(() => setCopie(true)).catch(() => {}); }}>
            {copie ? "✅ Copié" : "Copier"}
          </button>
        </div>
      )}
    </div>
  );
}
