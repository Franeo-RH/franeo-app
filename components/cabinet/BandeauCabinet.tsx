"use client";

import { useState } from "react";

/** Dans le dossier d'un client : rappel du cabinet, changement de dossier, retour au portefeuille */
export default function BandeauCabinet({ cabinet, clientId, clients }: { cabinet: string; clientId: string; clients: { id: string; nom: string }[] }) {
  const [chargement, setChargement] = useState(false);
  async function ouvrir(entrepriseId: string | null) {
    setChargement(true);
    const res = await fetch("/api/cabinet/client", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entrepriseId }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setChargement(false); return; }
    window.location.href = data.vers || "/cabinet"; // rechargement complet : droits et menus du nouveau dossier
  }
  return (
    <div className="fr-cab-bandeau fr-pas-imprimer">
      <span className="fr-cab-bandeau-cabinet">🏛️ {cabinet}</span>
      <label className="fr-cab-bandeau-choix">
        <span>Dossier</span>
        <select value={clientId} disabled={chargement} onChange={(e) => ouvrir(e.target.value)} aria-label="Changer de dossier client">
          {clients.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
      </label>
      <button type="button" onClick={() => ouvrir(null)} disabled={chargement} className="fr-cab-bandeau-retour">← Portefeuille</button>
    </div>
  );
}
