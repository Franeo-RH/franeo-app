"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Fiche salarié : droits RGPD (export de toutes ses données, anonymisation quand il est sorti) */
export default function RgpdSalarie({
  salarieId,
  sorti,
  anonymiseLe,
  peutExporter = true,
  peutAnonymiser = false,
  messageAnonymisation,
}: {
  salarieId: string;
  sorti: boolean;
  anonymiseLe?: string | null;
  peutExporter?: boolean;
  peutAnonymiser?: boolean;
  /** Affiché à la place du bouton quand l'anonymisation passe par FRANEO RH */
  messageAnonymisation?: string;
}) {
  const router = useRouter();
  const [etat, setEtat] = useState<{ ok: boolean; t: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function anonymiser() {
    const saisie = prompt(
      "Anonymiser ce salarié ?\n\nSon identité, ses coordonnées, son n° de sécurité sociale, son IBAN, ses pointages, ses documents et son compte seront effacés définitivement. Les données de paie restent (obligation légale), sans nom.\n\nTapez ANONYMISER pour confirmer."
    );
    if (saisie?.trim().toUpperCase() !== "ANONYMISER") return;
    setEnvoi(true);
    const r = await fetch(`/api/rgpd/salarie/${salarieId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation: "ANONYMISER" }) });
    const j = await r.json().catch(() => ({}));
    setEnvoi(false);
    if (r.ok) {
      setEtat({ ok: true, t: "✅ Salarié anonymisé." });
      router.refresh();
    } else setEtat({ ok: false, t: j.erreur || "Erreur" });
  }

  const date = anonymiseLe ? new Date(anonymiseLe).toLocaleDateString("fr-FR") : null;

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-bold mb-1">🔐 Données personnelles (RGPD)</h2>
      {date ? (
        <p className="text-sm text-gray-600">Salarié anonymisé le {date}. Seules les données de paie sont conservées, sans identité.</p>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-4">
            Si le salarié vous demande ses données, téléchargez le fichier complet et transmettez-le-lui (délai légal : 1 mois).
            {sorti ? " Ce salarié est sorti : vous pouvez anonymiser ses données." : " L'anonymisation est possible une fois le salarié sorti de l'entreprise."}
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            {peutExporter && (
              <a href={`/api/rgpd/salarie/${salarieId}`} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold">
                ⬇️ Télécharger toutes ses données
              </a>
            )}
            {sorti && peutAnonymiser && (
              <button type="button" onClick={anonymiser} disabled={envoi} className="px-4 py-2 rounded-lg border-2 border-red-200 text-red-700 text-sm font-semibold disabled:opacity-50">
                {envoi ? "Anonymisation…" : "Anonymiser ce salarié"}
              </button>
            )}
            {sorti && !peutAnonymiser && messageAnonymisation && <span className="text-sm text-gray-500">{messageAnonymisation}</span>}
          </div>
        </>
      )}
      {etat && <p className={`text-sm mt-3 ${etat.ok ? "text-green-700" : "text-red-700"}`}>{etat.t}</p>}
    </div>
  );
}
