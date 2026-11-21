"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Petit bouton qui appelle une API (POST JSON) puis rafraîchit la page */
export default function BoutonAction({ url, corps, label, confirmer, className }: { url: string; corps: Record<string, unknown>; label: string; confirmer?: string; className?: string }) {
  const router = useRouter();
  const [etat, setEtat] = useState<"" | "…" | "✅" | "❌">("");
  const [erreur, setErreur] = useState("");
  return (
    <span className="inline-flex flex-col">
      <button type="button" disabled={etat === "…"} className={className ?? "text-sm font-semibold text-orange-600 hover:underline"}
        onClick={async () => {
          if (confirmer && !confirm(confirmer)) return;
          setEtat("…"); setErreur("");
          const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
          const d = await r.json().catch(() => ({}));
          setEtat(r.ok ? "✅" : "❌"); if (!r.ok) setErreur(d.erreur || "Erreur");
          if (r.ok) router.refresh();
        }}>
        {label} {etat}
      </button>
      {erreur && <span className="text-xs text-red-600">{erreur}</span>}
    </span>
  );
}
