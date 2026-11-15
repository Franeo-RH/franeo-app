"use client";

// Admin : devis ou demande validé(e) → saisir le montant et le mois de facturation.
// Le montant s'ajoute à la facture de ce mois (et donc aux tableaux de bord admin et client).

import { useMemo, useState } from "react";
import { libelleMois } from "@/lib/devis";

const eur = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} € HT`;

export default function FacturerDemande({
  url, montantInitial, montantFacture, factureMois, factureAnnee, onChange,
}: {
  url: string; // route PUT du devis ou de la demande
  montantInitial?: number | null;
  montantFacture?: number | null;
  factureMois?: number | null;
  factureAnnee?: number | null;
  onChange: () => void;
}) {
  const maintenant = new Date();
  const [edition, setEdition] = useState(false);
  const [montant, setMontant] = useState(String(montantFacture ?? montantInitial ?? ""));
  const [periode, setPeriode] = useState(`${factureAnnee ?? maintenant.getFullYear()}-${factureMois ?? maintenant.getMonth() + 1}`);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Du mois dernier aux 12 prochains mois
  const choix = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1 + i, 1);
    return { valeur: `${d.getFullYear()}-${d.getMonth() + 1}`, label: libelleMois(d.getMonth() + 1, d.getFullYear()) };
  }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const options = choix.some((c) => c.valeur === periode) ? choix : [{ valeur: periode, label: libelleMois(Number(periode.split("-")[1]), Number(periode.split("-")[0])) }, ...choix];

  async function envoyer(corps: Record<string, unknown>) {
    setOccupe(true); setErreur(null);
    const r = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    const j = await r.json().catch(() => ({}));
    setOccupe(false);
    if (!r.ok) { setErreur(j.erreur || "Erreur"); return; }
    setEdition(false);
    onChange();
  }

  if (montantFacture && factureMois && factureAnnee && !edition) {
    return (
      <div className="rounded-lg p-4 flex flex-wrap gap-3 items-center justify-between" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
        <p className="text-sm"><strong>✅ Validé</strong> · {eur(montantFacture)} ajoutés à la facture de <strong>{libelleMois(factureMois, factureAnnee)}</strong></p>
        <div className="flex gap-3 text-sm">
          <button type="button" onClick={() => setEdition(true)} className="font-semibold text-orange-700">✏️ Modifier</button>
          <button type="button" disabled={occupe} onClick={() => { if (confirm("Retirer ce montant de la facture du mois ?")) envoyer({ action: "retirerFacture" }); }} className="text-red-600">Retirer de la facture</button>
        </div>
      </div>
    );
  }

  const [annee, mois] = periode.split("-").map(Number);
  return (
    <div className="rounded-lg p-4 flex flex-col gap-2" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
      <p className="font-semibold text-sm">💶 Validé par le client ? Ajoutez le montant à sa facture</p>
      <div className="flex gap-2 flex-wrap items-center">
        <input inputMode="decimal" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="Montant HT (€)" className="border rounded-lg px-3 py-2" style={{ width: 150 }} aria-label="Montant HT" />
        <select value={periode} onChange={(e) => setPeriode(e.target.value)} className="border rounded-lg px-3 py-2" aria-label="Mois de facturation">
          {options.map((o) => <option key={o.valeur} value={o.valeur}>Facture de {o.label}</option>)}
        </select>
        <button type="button" disabled={occupe || !montant.trim()} onClick={() => envoyer({ action: "facturer", montant, mois, annee })}
          style={{ background: "#16a34a", color: "#ffffff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 700, cursor: "pointer", opacity: occupe ? 0.6 : 1 }}>
          {occupe ? "…" : "✅ Valider et ajouter à la facture"}
        </button>
        {edition && <button type="button" onClick={() => setEdition(false)} className="text-sm text-gray-500 underline">Annuler</button>}
      </div>
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
    </div>
  );
}
