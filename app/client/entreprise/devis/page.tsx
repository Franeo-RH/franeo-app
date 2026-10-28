"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { FAMILLES, OFFRES, type Offre } from "@/lib/catalogue";
import { STATUTS_DEVIS, type DevisVue } from "@/lib/devis";
import FilMessages from "@/components/FilMessages";

const eur = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;
const prixTexte = (o: Offre) => (o.prix === null ? "sur devis" : `${o.apartir ? "dès " : ""}${eur(o.prix)}`);

export default function DemandeDevis() {
  const [famille, setFamille] = useState<string>(FAMILLES[0]);
  const [recherche, setRecherche] = useState("");
  const [panier, setPanier] = useState<Record<string, { quantite: number; precision: string }>>({});
  const [message, setMessage] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const [mesDevis, setMesDevis] = useState<DevisVue[]>([]);

  const charger = () => fetch("/api/devis").then((r) => r.json()).then((d) => Array.isArray(d) && setMesDevis(d)).catch(() => {});
  useEffect(() => { charger(); }, []);

  const liste = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return OFFRES.filter((o) => (q ? `${o.libelle} ${o.categorie} ${o.famille}`.toLowerCase().includes(q) : o.famille === famille));
  }, [famille, recherche]);
  const parCategorie = useMemo(() => {
    const m = new Map<string, Offre[]>();
    for (const o of liste) m.set(o.categorie, [...(m.get(o.categorie) || []), o]);
    return [...m.entries()];
  }, [liste]);

  const choisies = OFFRES.filter((o) => panier[o.code]);
  const total = choisies.reduce((a, o) => a + (o.prix ?? 0) * panier[o.code].quantite, 0);
  const surDevis = choisies.some((o) => o.prix === null);

  function basculer(o: Offre) {
    setPanier((p) => {
      const n = { ...p };
      if (n[o.code]) delete n[o.code];
      else n[o.code] = { quantite: 1, precision: "" };
      return n;
    });
  }

  async function envoyer() {
    setEnvoi(true);
    setRetour(null);
    const res = await fetch("/api/devis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, lignes: choisies.map((o) => ({ code: o.code, ...panier[o.code] })) }),
    });
    const d = await res.json().catch(() => ({}));
    setEnvoi(false);
    if (!res.ok) { setRetour({ ok: false, texte: `❌ ${d.erreur || "Erreur"}` }); return; }
    setRetour({ ok: true, texte: "✅ Demande envoyée : vous recevrez une proposition chiffrée ici même." });
    setPanier({});
    setMessage("");
    charger();
  }

  async function decider(id: string, action: "accepter" | "refuser" | "annuler") {
    const textes = { accepter: "Accepter cette proposition ?", refuser: "Refuser cette proposition ?", annuler: "Annuler cette demande ?" };
    if (!confirm(textes[action])) return;
    const res = await fetch(`/api/devis/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    if (!res.ok) alert("Action impossible");
    charger();
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="CLIENT" prenom="" />
      <div className="flex">
        <Sidebar role="CLIENT" />
        <main className="flex-1 p-6 md:p-10 flex flex-col gap-6" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-3xl font-bold">🧾 Demande de devis</h1>
            <p className="text-gray-500 mt-1">Choisissez les prestations dont vous avez besoin : le total indicatif se calcule en direct. FRANEO RH vous renvoie une proposition chiffrée à accepter ici.</p>
          </div>

          <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", alignItems: "start" }}>
            <div className="bg-white rounded-xl shadow p-5" style={{ minWidth: 0 }}>
              <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="🔍 Rechercher une prestation (ex : avenant, IJSS, Power BI…)" className="w-full border rounded-lg px-4 py-3 mb-3" aria-label="Rechercher" />
              {!recherche && (
                <div className="flex gap-2 flex-wrap mb-4" role="tablist">
                  {FAMILLES.map((f) => (
                    <button key={f} type="button" role="tab" aria-selected={famille === f} onClick={() => setFamille(f)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold ${famille === f ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-700"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              )}
              {famille === "Prestations à l'unité" && !recherche && (
                <p className="text-sm text-gray-500 mb-3">130 tâches RH à prix fixe, sans abonnement : Simple dès 30 €, Standard dès 50 €, Complexe dès 100 €.</p>
              )}
              {parCategorie.length === 0 && <p className="text-gray-500 text-sm">Aucune prestation trouvée.</p>}
              <div className="flex flex-col gap-4" style={{ maxHeight: "60vh", overflowY: "auto" }}>
                {parCategorie.map(([cat, offres]) => (
                  <div key={cat}>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">{cat}</p>
                    <ul className="flex flex-col gap-1">
                      {offres.map((o) => {
                        const pris = !!panier[o.code];
                        return (
                          <li key={o.code}>
                            <button type="button" onClick={() => basculer(o)} aria-pressed={pris}
                              style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", textAlign: "left", padding: "10px 12px", borderRadius: "10px", border: `1px solid ${pris ? "#f97316" : "#e5e7eb"}`, background: pris ? "#fff7ed" : "#ffffff", cursor: "pointer" }}>
                              <span style={{ minWidth: 0 }}>
                                <span style={{ display: "block", fontWeight: 600, fontSize: "14px" }}>{pris ? "✅ " : "➕ "}{o.libelle}</span>
                                {o.note && <span style={{ display: "block", fontSize: "12px", color: "#6b7280" }}>{o.note}</span>}
                              </span>
                              <span style={{ fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap", color: "#c2410c" }}>{prixTexte(o)}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-3" style={{ position: "sticky", top: "16px" }}>
              <h2 className="text-xl font-bold">🛒 Ma sélection ({choisies.length})</h2>
              {choisies.length === 0 && <p className="text-sm text-gray-500">Cliquez sur une prestation pour l&apos;ajouter.</p>}
              {choisies.map((o) => (
                <div key={o.code} className="border rounded-lg p-3">
                  <div className="flex justify-between gap-2">
                    <p className="font-semibold text-sm">{o.libelle}</p>
                    <button type="button" onClick={() => basculer(o)} aria-label="Retirer" className="text-gray-400">✖</button>
                  </div>
                  <div className="flex gap-2 items-center mt-2 flex-wrap">
                    <label className="text-sm">Quantité
                      <input type="number" min={1} max={999} value={panier[o.code].quantite}
                        onChange={(e) => setPanier({ ...panier, [o.code]: { ...panier[o.code], quantite: Math.max(1, Number(e.target.value) || 1) } })}
                        className="border rounded px-2 py-1 ml-2" style={{ width: "70px" }} />
                    </label>
                    <span className="text-sm font-bold ml-auto">{o.prix === null ? "sur devis" : `${o.apartir ? "dès " : ""}${eur(o.prix * panier[o.code].quantite)}`}</span>
                  </div>
                  <input value={panier[o.code].precision} maxLength={300} placeholder="Précision (facultatif)"
                    onChange={(e) => setPanier({ ...panier, [o.code]: { ...panier[o.code], precision: e.target.value } })}
                    className="w-full border rounded px-2 py-1 mt-2 text-sm" />
                </div>
              ))}
              <label className="text-sm font-semibold">Votre besoin (facultatif)
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={3} className="w-full border rounded-lg px-3 py-2 mt-1" placeholder="Effectif, convention collective, délais, contexte…" />
              </label>
              <div className="flex justify-between items-baseline border-t pt-3">
                <span className="font-semibold">Total indicatif</span>
                <span className="text-2xl font-bold">{total > 0 ? `${surDevis || choisies.some((o) => o.apartir) ? "dès " : ""}${eur(total)}` : surDevis ? "sur devis" : "0 €"}</span>
              </div>
              <button type="button" onClick={envoyer} disabled={envoi || (choisies.length === 0 && !message.trim())}
                style={{ background: "#f97316", color: "#ffffff", border: "none", borderRadius: "10px", padding: "13px", fontWeight: 700, fontSize: "15px", cursor: "pointer", opacity: envoi || (choisies.length === 0 && !message.trim()) ? 0.5 : 1 }}>
                {envoi ? "Envoi…" : "📩 Demander mon devis"}
              </button>
              {retour && <p className="text-sm font-semibold" style={{ color: retour.ok ? "#15803d" : "#b91c1c" }}>{retour.texte}</p>}
              <p className="text-xs text-gray-500">Prix nets, TVA non applicable. Le montant exact est confirmé dans la proposition.</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">📂 Mes demandes de devis</h2>
            {mesDevis.length === 0 ? <p className="text-gray-500 text-sm">Aucune demande pour le moment.</p> : (
              <div className="flex flex-col gap-3">
                {mesDevis.map((d) => {
                  const st = STATUTS_DEVIS[d.statut] || STATUTS_DEVIS.EN_ATTENTE;
                  return (
                    <div key={d.id} className="border rounded-xl p-4">
                      <div className="flex justify-between gap-3 flex-wrap items-center">
                        <p className="font-semibold">Demande du {new Date(d.createdAt).toLocaleDateString("fr-FR")} · indicatif {eur(d.totalIndicatif)}</p>
                        <span style={{ background: st.fond, color: st.texte, borderRadius: "999px", padding: "3px 10px", fontSize: "12px", fontWeight: 700 }}>{st.label}</span>
                      </div>
                      <ul className="text-sm text-gray-600 mt-2">
                        {d.lignes.map((l, i) => <li key={i}>• {l.libelle} × {l.quantite}{l.precision ? ` — ${l.precision}` : ""}</li>)}
                      </ul>
                      {d.message && <p className="text-sm text-gray-500 mt-1">💬 {d.message}</p>}
                      {d.montantPropose !== null && (
                        <div className="mt-3 rounded-lg p-3" style={{ background: "#eff6ff" }}>
                          <p className="font-bold">Proposition : {eur(d.montantPropose)}</p>
                          {d.reponse && <p className="text-sm mt-1" style={{ whiteSpace: "pre-line" }}>{d.reponse}</p>}
                        </div>
                      )}
                      <details className="mt-3" open={(d.messages?.length ?? 0) > 0}>
                        <summary className="cursor-pointer text-sm font-semibold text-orange-600">💬 Échange ({d.messages?.length ?? 0})</summary>
                        <div className="mt-2">
                          <FilMessages
                            moi="CLIENT"
                            messages={d.messages ?? []}
                            desactive={d.statut === "ANNULE"}
                            placeholder="Une question sur ce devis ? Écrivez à FRANEO RH…"
                            onEnvoyer={async (contenu) => {
                              const res = await fetch(`/api/devis/${d.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contenu }) });
                              if (res.ok) charger();
                              return res.ok;
                            }}
                          />
                        </div>
                      </details>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {d.statut === "ENVOYE" && (
                          <>
                            <button type="button" onClick={() => decider(d.id, "accepter")} style={{ background: "#16a34a", color: "#ffffff", border: "none", borderRadius: "8px", padding: "8px 14px", fontWeight: 700, cursor: "pointer" }}>✅ Accepter</button>
                            <button type="button" onClick={() => decider(d.id, "refuser")} style={{ background: "#dc2626", color: "#ffffff", border: "none", borderRadius: "8px", padding: "8px 14px", fontWeight: 700, cursor: "pointer" }}>Refuser</button>
                          </>
                        )}
                        {d.statut === "EN_ATTENTE" && <button type="button" onClick={() => decider(d.id, "annuler")} className="text-sm text-gray-500 underline">Annuler la demande</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
