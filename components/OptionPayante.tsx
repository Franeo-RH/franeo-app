"use client";

// Carte d'une option (Projets, Documents & contrats) : prix selon la formule, ou « incluse » ;
// le client en demande l'activation, FRANEO RH l'active en validant la demande.

import { useState } from "react";

export type EtatOption = "active" | "demandee" | "disponible";

export default function OptionPayante({
  type, icone, titre, description, prix, conditions, inclus, etat, peutDemander,
}: {
  type: "OPTION_PROJETS" | "OPTION_DOCUMENTS";
  icone: string; titre: string; description: string;
  prix: number; conditions: string; inclus: boolean; etat: EtatOption; peutDemander: boolean;
}) {
  const [e, setE] = useState(etat);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function demander() {
    setEnvoi(true); setErreur(null);
    const r = await fetch("/api/demandes-services", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, options: [inclus ? `${titre} (incluse dans la formule)` : `${titre} ${prix} € HT/mois`] }),
    });
    const j = await r.json().catch(() => ({}));
    setEnvoi(false);
    if (r.ok) setE("demandee"); else setErreur(j.erreur || "Demande impossible");
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-wrap gap-4 items-center justify-between" style={{ borderLeft: `6px solid ${inclus ? "#16a34a" : "#f97316"}` }}>
      <div className="min-w-0 flex-1" style={{ minWidth: 240 }}>
        <p className={`text-xs font-bold uppercase ${inclus ? "text-green-700" : "text-orange-600"}`}>{inclus ? "Inclus dans votre formule" : "Option"}</p>
        <h2 className="text-xl font-bold">{icone} {titre}</h2>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
        {inclus
          ? <p className="text-2xl font-bold text-green-600 mt-2">Inclus <span className="text-gray-400 text-sm font-normal">· {conditions}</span></p>
          : <p className="text-2xl font-bold text-orange-500 mt-2">{prix} € <span className="text-gray-400 text-sm font-normal">HT / mois · {conditions}</span></p>}
      </div>
      <div className="flex flex-col items-end gap-2">
        {e === "active" && <span className="bg-green-100 text-green-700 font-semibold rounded-lg px-4 py-2 text-sm">✅ {inclus ? "Activé" : "Option active"}</span>}
        {e === "demandee" && <span className="bg-orange-100 text-orange-700 font-semibold rounded-lg px-4 py-2 text-sm">⏳ Demande envoyée à FRANEO RH</span>}
        {e === "disponible" && (peutDemander
          ? <button type="button" onClick={demander} disabled={envoi} className={`${inclus ? "bg-green-600" : "bg-orange-500"} text-white font-semibold rounded-lg px-5 py-3 disabled:opacity-50`}>{envoi ? "Envoi…" : inclus ? "Demander l'activation" : "Demander l'accès"}</button>
          : <span className="text-sm text-gray-500">Demande réservée au dirigeant de l&apos;entreprise.</span>)}
        {erreur && <p className="text-sm text-red-700">{erreur}</p>}
      </div>
    </div>
  );
}
