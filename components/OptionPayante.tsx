"use client";

// Carte d'une option (Projets, Documents & contrats) : prix selon la formule, ou « incluse ».
// Le dirigeant l'active ou l'arrête à tout moment : elle entre aussitôt dans le calcul de la facture du mois.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { oublierDroits } from "@/components/useDroits";

export type EtatOption = "active" | "demandee" | "disponible";

export default function OptionPayante({
  option, icone, titre, description, prix, conditions, inclus, etat, peutDemander,
}: {
  option: "projets" | "documents";
  icone: string; titre: string; description: string;
  prix: number; conditions: string; inclus: boolean; etat: EtatOption; peutDemander: boolean;
}) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const active = etat === "active";

  async function changer(action: "activer" | "arreter") {
    const question = action === "activer"
      ? (inclus ? `Activer « ${titre} » ? Elle est incluse dans votre formule.` : `Activer « ${titre} » ? ${prix} € HT/mois seront ajoutés à votre facture, dès ce mois-ci.`)
      : `Arrêter « ${titre} » ?${inclus ? "" : " Elle ne sera plus facturée à partir de la prochaine facture."}`;
    if (!confirm(question)) return;
    setEnvoi(true); setErreur(null);
    const r = await fetch("/api/options", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ option, action }) });
    const j = await r.json().catch(() => ({}));
    setEnvoi(false);
    if (!r.ok) { setErreur(j.erreur || "Action impossible"); return; }
    oublierDroits(); // le menu affiche tout de suite les nouvelles pages
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-wrap gap-4 items-center justify-between" style={{ borderLeft: `6px solid ${active ? "#16a34a" : inclus ? "#16a34a" : "#f97316"}` }}>
      <div className="min-w-0 flex-1" style={{ minWidth: 240 }}>
        <p className={`text-xs font-bold uppercase ${inclus ? "text-green-700" : "text-orange-600"}`}>{inclus ? "Inclus dans votre formule" : "Option"}</p>
        <h2 className="text-xl font-bold">{icone} {titre}</h2>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
        {inclus
          ? <p className="text-2xl font-bold text-green-600 mt-2">Inclus <span className="text-gray-400 text-sm font-normal">· {conditions}</span></p>
          : <p className="text-2xl font-bold text-orange-500 mt-2">{prix} € <span className="text-gray-400 text-sm font-normal">HT / mois · {conditions}</span></p>}
        {active && !inclus && <p className="text-sm text-gray-600 mt-1">✅ Comprise dans le calcul de votre facture du mois.</p>}
      </div>
      <div className="flex flex-col items-end gap-2">
        {active && <span className="bg-green-100 text-green-700 font-semibold rounded-lg px-4 py-2 text-sm">✅ {inclus ? "Activée" : "Option active"}</span>}
        {peutDemander ? (
          active
            ? (!(inclus && option === "documents") && <button type="button" onClick={() => changer("arreter")} disabled={envoi} className="text-sm text-gray-500 underline disabled:opacity-50">{envoi ? "…" : "Arrêter l'option"}</button>)
            : <button type="button" onClick={() => changer("activer")} disabled={envoi} className={`${inclus ? "bg-green-600" : "bg-orange-500"} text-white font-semibold rounded-lg px-5 py-3 disabled:opacity-50`}>{envoi ? "…" : inclus ? "Activer" : `Activer (+${prix} € / mois)`}</button>
        ) : !active && <span className="text-sm text-gray-500">Réservé au dirigeant de l&apos;entreprise.</span>}
        {erreur && <p className="text-sm text-red-700">{erreur}</p>}
      </div>
    </div>
  );
}
