"use client";

import { useEffect, useState } from "react";
import { NOMS_MOIS } from "@/lib/heures";

const LIB: Record<string, string> = { DEMANDE_CLOTURE: "⏳ Clôture demandée", CLOTURE: "🔒 Mois clôturé", DEMANDE_DECLOTURE: "⏳ Réouverture demandée" };

/** Demander la clôture du mois (ou sa réouverture) à FRANEO RH */
export default function BoutonCloture({ mois, annee }: { mois: number; annee: number }) {
  const [statut, setStatut] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  useEffect(() => {
    fetch(`/api/cloture?mois=${mois}&annee=${annee}`).then((r) => (r.ok ? r.json() : null)).then((d) => setStatut(d?.statut ?? null)).catch(() => {});
  }, [mois, annee]);
  async function demander(action: "cloturer" | "decloturer") {
    const periode = `${NOMS_MOIS[mois - 1]} ${annee}`;
    if (!confirm(action === "cloturer" ? `Demander la clôture de ${periode} ? Toutes les variables et absences du mois doivent être saisies.` : `Demander la réouverture de ${periode} ?`)) return;
    setOccupe(true);
    const res = await fetch("/api/cloture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mois, annee, action }) });
    const d = await res.json().catch(() => ({}));
    setOccupe(false);
    if (res.ok) setStatut(d.statut); else alert(d.erreur || "Erreur");
  }
  const fermeOuDemande = statut === "CLOTURE" || statut === "DEMANDE_CLOTURE";
  return (
    <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-2">
      <h2 className="text-sm font-bold">🔒 Clôture de {NOMS_MOIS[mois - 1]}</h2>
      <p className="text-sm text-gray-600">{statut ? LIB[statut] || statut : "Mois ouvert : saisies possibles"}</p>
      <button
        type="button"
        disabled={occupe || statut === "DEMANDE_DECLOTURE"}
        onClick={() => demander(fermeOuDemande ? "decloturer" : "cloturer")}
        className={`px-4 py-2 rounded-lg font-semibold text-white ${fermeOuDemande ? "bg-gray-700" : "bg-orange-500"}`}
        style={{ opacity: occupe || statut === "DEMANDE_DECLOTURE" ? 0.5 : 1 }}
      >
        {fermeOuDemande ? "🔓 Demander la réouverture" : "🔒 Demander la clôture"}
      </button>
    </div>
  );
}
