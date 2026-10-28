"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ExportCSV from "@/components/ExportCSV";
import { STATUTS_DEVIS, type DevisVue } from "@/lib/devis";
import FilMessages from "@/components/FilMessages";
import { BoutonExportComplet } from "@/components/OutilsAdmin";

const eur = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;

export default function AdminDevis() {
  const [devis, setDevis] = useState<DevisVue[]>([]);
  const [entreprises, setEntreprises] = useState<{ id: string; nom: string }[]>([]);
  const [statut, setStatut] = useState("EN_ATTENTE");
  const [entrepriseId, setEntrepriseId] = useState("");
  const [reponses, setReponses] = useState<Record<string, { montant: string; reponse: string }>>({});
  const [occupe, setOccupe] = useState(false);

  const charger = useCallback(async () => {
    const q = new URLSearchParams();
    if (statut) q.set("statut", statut);
    if (entrepriseId) q.set("entrepriseId", entrepriseId);
    const d = await fetch(`/api/devis?${q}`).then((r) => r.json()).catch(() => []);
    setDevis(Array.isArray(d) ? d : []);
  }, [statut, entrepriseId]);

  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { fetch("/api/entreprises").then((r) => r.json()).then((d) => Array.isArray(d) && setEntreprises(d)); }, []);

  async function appeler(id: string, corps: Record<string, unknown>, methode = "PUT") {
    setOccupe(true);
    const res = await fetch(`/api/devis/${id}`, { method: methode, headers: { "Content-Type": "application/json" }, body: methode === "PUT" ? JSON.stringify(corps) : undefined });
    setOccupe(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.erreur || "Erreur"); }
    charger();
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom="" />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-6 md:p-10 flex flex-col gap-6" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-3xl font-bold">🧾 Demandes de devis</h1>
            <div className="flex gap-2 flex-wrap mt-3"><BoutonExportComplet jeu="devis" label="📥 Export complet (devis + échanges)" /></div>
            <p className="text-gray-500 mt-1">Les clients composent leur devis depuis le catalogue. Envoyez une proposition chiffrée : ils l&apos;acceptent ou la refusent dans leur espace.</p>
            <div className="flex gap-2 flex-wrap mt-4 items-center">
              <select value={statut} onChange={(e) => setStatut(e.target.value)} className="border rounded-lg px-3 py-2" aria-label="Statut">
                <option value="">Tous les statuts</option>
                {Object.entries(STATUTS_DEVIS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={entrepriseId} onChange={(e) => setEntrepriseId(e.target.value)} className="border rounded-lg px-3 py-2" aria-label="Entreprise">
                <option value="">Tous les clients</option>
                {entreprises.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
              <ExportCSV nom="devis" entetes={["Date", "Client", "Statut", "Prestations", "Total indicatif", "Proposition"]}
                lignes={devis.map((d) => [new Date(d.createdAt).toLocaleDateString("fr-FR"), d.entreprise?.nom || "", STATUTS_DEVIS[d.statut]?.label || d.statut, d.lignes.map((l) => `${l.libelle} x${l.quantite}`).join(" | "), d.totalIndicatif, d.montantPropose ?? ""])} />
            </div>
          </div>

          {devis.length === 0 ? <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">Aucune demande de devis avec ces filtres.</div> : devis.map((d) => {
            const st = STATUTS_DEVIS[d.statut] || STATUTS_DEVIS.EN_ATTENTE;
            const r = reponses[d.id] || { montant: d.montantPropose !== null ? String(d.montantPropose) : String(d.totalIndicatif || ""), reponse: d.reponse || "" };
            return (
              <div key={d.id} className="bg-white rounded-xl shadow p-6">
                <div className="flex justify-between gap-3 flex-wrap items-center">
                  <div>
                    <p className="text-lg font-bold">{d.entreprise?.nom}</p>
                    <p className="text-sm text-gray-500">{new Date(d.createdAt).toLocaleString("fr-FR")} · {d.auteur}</p>
                  </div>
                  <span style={{ background: st.fond, color: st.texte, borderRadius: "999px", padding: "4px 12px", fontSize: "12px", fontWeight: 700 }}>{st.label}</span>
                </div>
                <table className="w-full text-sm mt-3">
                  <thead><tr className="border-b text-gray-500 text-left"><th className="py-1">Prestation</th><th className="py-1">Qté</th><th className="py-1">Prix</th><th className="py-1">Précision</th></tr></thead>
                  <tbody>
                    {d.lignes.map((l, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-1">{l.libelle}<span className="block text-xs text-gray-400">{l.famille}</span></td>
                        <td className="py-1">{l.quantite}</td>
                        <td className="py-1">{l.total === null ? "sur devis" : `${l.apartir ? "dès " : ""}${eur(l.total)}`}</td>
                        <td className="py-1 text-gray-500">{l.precision || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {d.message && <p className="text-sm mt-2">💬 {d.message}</p>}
                <p className="text-sm font-semibold mt-2">Total indicatif : {eur(d.totalIndicatif)}</p>

                {(d.statut === "EN_ATTENTE" || d.statut === "ENVOYE") && (
                  <div className="mt-4 rounded-lg p-4 flex flex-col gap-2" style={{ background: "#f9fafb" }}>
                    <p className="font-semibold text-sm">{d.statut === "ENVOYE" ? "Modifier la proposition" : "Envoyer une proposition"}</p>
                    <div className="flex gap-2 flex-wrap">
                      <input inputMode="decimal" value={r.montant} onChange={(e) => setReponses({ ...reponses, [d.id]: { ...r, montant: e.target.value } })} placeholder="Montant (€)" className="border rounded-lg px-3 py-2" style={{ width: "140px" }} aria-label="Montant proposé" />
                      <input value={r.reponse} onChange={(e) => setReponses({ ...reponses, [d.id]: { ...r, reponse: e.target.value } })} placeholder="Message au client (détail, délais…)" className="border rounded-lg px-3 py-2 flex-1" style={{ minWidth: "200px" }} aria-label="Message" />
                      <button type="button" disabled={occupe} onClick={() => appeler(d.id, { action: "repondre", montant: r.montant, reponse: r.reponse })} style={{ background: "#f97316", color: "#ffffff", border: "none", borderRadius: "8px", padding: "8px 14px", fontWeight: 700, cursor: "pointer" }}>📩 Envoyer</button>
                    </div>
                  </div>
                )}
                      <details className="mt-3" open={(d.messages?.length ?? 0) > 0}>
                        <summary className="cursor-pointer text-sm font-semibold text-orange-600">💬 Échange ({d.messages?.length ?? 0})</summary>
                        <div className="mt-2">
                          <FilMessages
                            moi="ADMIN"
                            messages={d.messages ?? []}
                            desactive={d.statut === "ANNULE"}
                            placeholder="Écrire au client…"
                            onEnvoyer={async (contenu) => {
                              const res = await fetch(`/api/devis/${d.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contenu }) });
                              if (res.ok) charger();
                              return res.ok;
                            }}
                          />
                        </div>
                      </details>
                {d.montantPropose !== null && d.statut !== "ENVOYE" && <p className="text-sm mt-2">Proposition envoyée : <strong>{eur(d.montantPropose)}</strong>{d.reponse ? ` — ${d.reponse}` : ""}</p>}
                <div className="flex gap-2 mt-3 flex-wrap items-center">
                  <select value={d.statut} onChange={(e) => appeler(d.id, { action: "statut", statut: e.target.value })} className="border rounded-lg px-2 py-1 text-sm" aria-label="Changer le statut">
                    {Object.entries(STATUTS_DEVIS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <button type="button" onClick={() => { if (confirm("Supprimer cette demande ?")) appeler(d.id, {}, "DELETE"); }} className="text-sm text-red-600">🗑️ Supprimer</button>
                </div>
              </div>
            );
          })}
        </main>
      </div>
    </div>
  );
}
