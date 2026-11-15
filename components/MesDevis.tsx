"use client";

// Client : ses demandes de devis, la proposition de FRANEO RH, l'échange (messages + devis PDF) et la validation.

import { useCallback, useEffect, useState } from "react";
import EchangeDemande from "@/components/EchangeDemande";
import { libelleMois, STATUTS_DEVIS, type DevisVue } from "@/lib/devis";

const eur = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} € HT`;

export default function MesDevis() {
  const [devis, setDevis] = useState<DevisVue[] | null>(null);
  const [occupe, setOccupe] = useState(false);

  const charger = useCallback(async () => {
    const d = await fetch("/api/devis").then((r) => (r.ok ? r.json() : [])).catch(() => []);
    setDevis(Array.isArray(d) ? d : []);
  }, []);
  useEffect(() => { charger(); }, [charger]);

  async function decider(id: string, action: "accepter" | "refuser") {
    if (!confirm(action === "accepter" ? "Accepter cette proposition ?" : "Refuser cette proposition ?")) return;
    setOccupe(true);
    const r = await fetch(`/api/devis/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    setOccupe(false);
    if (!r.ok) alert((await r.json().catch(() => ({}))).erreur || "Erreur");
    charger();
  }

  if (!devis || devis.length === 0) return null;
  return (
    <div className="bg-white rounded-xl shadow p-6 mt-6">
      <h2 className="text-xl font-bold mb-1">🧾 Mes devis</h2>
      <p className="text-sm text-gray-500 mb-4">Propositions de FRANEO RH, documents et échanges.</p>
      <div className="flex flex-col divide-y">
        {devis.map((d) => {
          const st = STATUTS_DEVIS[d.statut] || STATUTS_DEVIS.EN_ATTENTE;
          const nbEchange = (d.messages?.length ?? 0) + (d.piecesJointes?.length ?? 0);
          return (
            <div key={d.id} className="py-4 flex flex-col gap-2">
              <div className="flex justify-between gap-3 flex-wrap items-start">
                <div style={{ minWidth: 0 }}>
                  <p className="font-semibold">Demande du {new Date(d.createdAt).toLocaleDateString("fr-FR")}</p>
                  {d.lignes.length > 0 && <p className="text-sm text-gray-600">{d.lignes.map((l) => `${l.libelle}${l.quantite > 1 ? ` × ${l.quantite}` : ""}`).join(" · ")}</p>}
                  {d.message && <p className="text-sm text-gray-600">{d.message}</p>}
                </div>
                <span style={{ background: st.fond, color: st.texte, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{st.label}</span>
              </div>

              {d.montantPropose !== null && (
                <div className="rounded-lg p-3 text-sm" style={{ background: "#eff6ff" }}>
                  <p>Proposition FRANEO RH : <strong>{eur(d.montantPropose)}</strong>{d.reponse ? ` — ${d.reponse}` : ""}</p>
                  {d.statut === "ENVOYE" && (
                    <div className="flex gap-2 mt-2">
                      <button type="button" disabled={occupe} onClick={() => decider(d.id, "accepter")} className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold">✅ Accepter</button>
                      <button type="button" disabled={occupe} onClick={() => decider(d.id, "refuser")} className="bg-white border px-4 py-2 rounded-lg font-semibold">Refuser</button>
                    </div>
                  )}
                </div>
              )}
              {d.montantFacture && d.factureMois && d.factureAnnee && (
                <p className="text-sm font-semibold" style={{ color: "#15803d" }}>✅ Validé : {eur(d.montantFacture)} sur la facture de {libelleMois(d.factureMois, d.factureAnnee)}</p>
              )}

              <details open={nbEchange > 0 && d.statut !== "ACCEPTE"}>
                <summary className="cursor-pointer text-sm font-semibold text-orange-600">💬 Échange avec FRANEO RH ({d.messages?.length ?? 0} message(s) · {d.piecesJointes?.length ?? 0} document(s))</summary>
                <div className="mt-2">
                  <EchangeDemande moi="CLIENT" messages={d.messages ?? []} piecesJointes={d.piecesJointes ?? []}
                    urlMessages={`/api/devis/${d.id}/messages`} urlPj={`/api/devis/${d.id}/pj`} onChange={charger} desactive={d.statut === "ANNULE"} />
                </div>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}
