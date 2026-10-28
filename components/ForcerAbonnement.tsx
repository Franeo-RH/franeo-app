"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Ent = { id: string; nom: string; abonnementId: string | null; abonnementPaieId: string | null };
type Formule = { id: string; nom: string; prixMensuel: number };

/** Bloc admin : changer directement le pack RH et la formule paie d'un client, sans demande */
export default function ForcerAbonnement({ entreprises, packsRH, formulesPaie }: { entreprises: Ent[]; packsRH: Formule[]; formulesPaie: Formule[] }) {
  const router = useRouter();
  const [entrepriseId, setEntrepriseId] = useState("");
  const [rh, setRh] = useState("");
  const [paie, setPaie] = useState("");
  const [prevenir, setPrevenir] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  function choisir(id: string) {
    setEntrepriseId(id);
    const e = entreprises.find((x) => x.id === id);
    setRh(e?.abonnementId ?? "");
    setPaie(e?.abonnementPaieId ?? "");
    setMessage(null);
  }

  const e = entreprises.find((x) => x.id === entrepriseId);
  const change = !!e && ((e.abonnementId ?? "") !== rh || (e.abonnementPaieId ?? "") !== paie);

  async function appliquer() {
    if (!e || !confirm(`Appliquer tout de suite ces abonnements à ${e.nom} ? La facture du mois sera recalculée.`)) return;
    setEnvoi(true);
    const res = await fetch(`/api/entreprises/${e.id}/abonnements`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ abonnementId: rh, abonnementPaieId: paie, prevenir }) });
    const d = await res.json().catch(() => ({}));
    setEnvoi(false);
    setMessage(res.ok ? { ok: true, texte: `✅ Modifié : ${(d.changements || []).join(" · ") || "aucun changement"}` } : { ok: false, texte: `❌ ${d.erreur || "Erreur"}` });
    if (res.ok) router.refresh();
  }

  const champ = "w-full border rounded-lg px-3 py-2 mt-1";
  return (
    <div className="bg-white rounded-xl shadow p-6 mb-6" style={{ borderLeft: "6px solid #f97316" }}>
      <h2 className="text-xl font-bold">⚡ Forcer une modification d&apos;abonnement</h2>
      <p className="text-gray-500 text-sm mt-1">Changez directement le pack RH ou la formule paie d&apos;un client, sans attendre sa demande. Effet immédiat sur la facture du mois.</p>
      <div className="grid gap-3 mt-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <label className="text-sm font-semibold">Entreprise
          <select value={entrepriseId} onChange={(ev) => choisir(ev.target.value)} className={champ}>
            <option value="">Choisir…</option>
            {entreprises.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Pack RH
          <select value={rh} onChange={(ev) => setRh(ev.target.value)} disabled={!e} className={champ}>
            <option value="">Aucun</option>
            {packsRH.map((f) => <option key={f.id} value={f.id}>{f.nom} — {f.prixMensuel} €/mois</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Formule paie
          <select value={paie} onChange={(ev) => setPaie(ev.target.value)} disabled={!e} className={champ}>
            <option value="">Aucune</option>
            {formulesPaie.map((f) => <option key={f.id} value={f.id}>{f.nom} — {f.prixMensuel} €/mois</option>)}
          </select>
        </label>
      </div>
      <div className="flex justify-between items-center gap-3 flex-wrap mt-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prevenir} onChange={(ev) => setPrevenir(ev.target.checked)} /> Prévenir le client par mail
        </label>
        <button type="button" onClick={appliquer} disabled={!change || envoi} style={{ background: "#f97316", color: "#ffffff", border: "none", borderRadius: "10px", padding: "10px 18px", fontWeight: 700, cursor: "pointer", opacity: !change || envoi ? 0.5 : 1 }}>
          {envoi ? "…" : "⚡ Appliquer maintenant"}
        </button>
      </div>
      {message && <p className="text-sm font-semibold mt-2" style={{ color: message.ok ? "#15803d" : "#b91c1c" }}>{message.texte}</p>}
    </div>
  );
}
