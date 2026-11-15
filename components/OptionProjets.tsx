"use client";

import { useState } from "react";
import { PRIX_OPTION_PROJETS } from "@/lib/projets-constantes";

/** Abonnement : demander l'option Projets (FRANEO RH l'active en validant la demande) */
export default function OptionProjets({ etat, peutDemander }: { etat: "active" | "demandee" | "disponible"; peutDemander: boolean }) {
  const [e, setE] = useState(etat);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function demander() {
    setEnvoi(true); setErreur(null);
    const r = await fetch("/api/demandes-services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "OPTION_PROJETS", options: [`Option Projets ${PRIX_OPTION_PROJETS} € HT/mois`] }) });
    const j = await r.json().catch(() => ({}));
    setEnvoi(false);
    if (r.ok) setE("demandee"); else setErreur(j.erreur || "Demande impossible");
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-wrap gap-4 items-center justify-between" style={{ borderLeft: "6px solid #f97316" }}>
      <div className="min-w-0 flex-1" style={{ minWidth: 240 }}>
        <p className="text-xs font-bold uppercase text-orange-600">Option</p>
        <h2 className="text-xl font-bold">📐 Projets, planning & rentabilité</h2>
        <p className="text-sm text-gray-600 mt-1">
          Planifiez vos équipes par projet ou chantier, suivez les heures pointées et le coût réel au jour le jour, comparez au prévisionnel et voyez la marge de chaque projet.
        </p>
        <p className="text-2xl font-bold text-orange-500 mt-2">{PRIX_OPTION_PROJETS} € <span className="text-gray-400 text-sm font-normal">HT / mois, quelle que soit la formule</span></p>
      </div>
      <div className="flex flex-col items-end gap-2">
        {e === "active" && <span className="bg-green-100 text-green-700 font-semibold rounded-lg px-4 py-2 text-sm">✅ Option active</span>}
        {e === "demandee" && <span className="bg-orange-100 text-orange-700 font-semibold rounded-lg px-4 py-2 text-sm">⏳ Demande envoyée à FRANEO RH</span>}
        {e === "disponible" && (peutDemander
          ? <button type="button" onClick={demander} disabled={envoi} className="bg-orange-500 text-white font-semibold rounded-lg px-5 py-3 disabled:opacity-50">{envoi ? "Envoi…" : "Demander l'accès"}</button>
          : <span className="text-sm text-gray-500">Demande réservée au dirigeant de l&apos;entreprise.</span>)}
        {erreur && <p className="text-sm text-red-700">{erreur}</p>}
      </div>
    </div>
  );
}
