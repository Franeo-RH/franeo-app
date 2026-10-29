"use client";

import { useState } from "react";
import { BESOINS, EFFECTIFS } from "@/lib/inscriptions";

/** Bouton + formulaire « Demander mon accès / Nous contacter » (démo et page de connexion) */
export default function DemandeAcces({ variante = "bandeau" }: { variante?: "bandeau" | "lien" }) {
  const [ouvert, setOuvert] = useState(false);
  const [type, setType] = useState<"INSCRIPTION" | "CONTACT">("INSCRIPTION");
  const [f, setF] = useState({ societe: "", prenom: "", nom: "", email: "", telephone: "", effectif: "", message: "", siteWeb: "" });
  const [besoins, setBesoins] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [etat, setEtat] = useState<{ ok: boolean; texte: string } | null>(null);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    const res = await fetch("/api/inscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, besoins, type }) });
    const d = await res.json().catch(() => ({}));
    setEnvoi(false);
    setEtat(res.ok ? { ok: true, texte: "✅ Merci ! FRANEO RH vous recontacte très vite." } : { ok: false, texte: `❌ ${d.erreur || "Envoi impossible"}` });
  }

  const champ: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #d1d5db", borderRadius: "8px", padding: "9px 10px", fontSize: "16px", color: "#111827", background: "#ffffff" };
  const ouvrir = (t: "INSCRIPTION" | "CONTACT") => { setType(t); setEtat(null); setOuvert(true); };

  return (
    <>
      {variante === "bandeau" ? (
        <span style={{ display: "inline-flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
          <button type="button" onClick={() => ouvrir("INSCRIPTION")} style={{ background: "#f97316", color: "#ffffff", border: "none", borderRadius: "999px", padding: "7px 16px", fontWeight: 800, fontSize: "14px", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }}>
            🚀 Demander mon accès
          </button>
          <button type="button" onClick={() => ouvrir("CONTACT")} style={{ background: "#ffffff", color: "#1d4ed8", border: "none", borderRadius: "999px", padding: "7px 16px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>
            ✉️ Nous contacter
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => ouvrir("INSCRIPTION")} style={{ background: "none", border: "none", color: "#ea580c", fontWeight: 700, fontSize: "14px", cursor: "pointer", textDecoration: "underline" }}>
          Pas encore client ? Demander un accès
        </button>
      )}

      {ouvert && (
        <div role="dialog" aria-modal="true" aria-label="Demande d'accès" onClick={() => setOuvert(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#ffffff", color: "#111827", borderRadius: "16px", padding: "20px", width: "100%", maxWidth: "500px", maxHeight: "92vh", overflowY: "auto", textAlign: "left" }}>
            <div style={{ display: "flex", gap: "6px", background: "#f3f4f6", borderRadius: "10px", padding: "4px", marginBottom: "14px" }}>
              {(["INSCRIPTION", "CONTACT"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setType(t)} style={{ flex: 1, border: "none", borderRadius: "8px", padding: "8px", fontWeight: 700, fontSize: "14px", cursor: "pointer", background: type === t ? "#ffffff" : "transparent", color: type === t ? "#ea580c" : "#6b7280" }}>
                  {t === "INSCRIPTION" ? "🚀 Demander mon accès" : "✉️ Être recontacté"}
                </button>
              ))}
            </div>
            {etat?.ok ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: "16px", fontWeight: 700, color: "#15803d" }}>{etat.texte}</p>
                <button type="button" onClick={() => setOuvert(false)} style={{ marginTop: "10px", background: "#111827", color: "#ffffff", border: "none", borderRadius: "8px", padding: "10px 18px", fontWeight: 700, cursor: "pointer" }}>Fermer</button>
              </div>
            ) : (
              <form onSubmit={envoyer} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <p style={{ margin: 0, fontSize: "14px", color: "#4b5563" }}>
                  {type === "INSCRIPTION" ? "Votre espace Franeo est créé après validation par FRANEO RH : vous recevez ensuite un lien pour choisir votre mot de passe." : "Laissez vos coordonnées, nous vous rappelons rapidement."}
                </p>
                <input required placeholder="Société *" value={f.societe} onChange={(e) => setF({ ...f, societe: e.target.value })} style={champ} aria-label="Société" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
                  <input required placeholder="Prénom *" value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} style={champ} aria-label="Prénom" />
                  <input required placeholder="Nom *" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} style={champ} aria-label="Nom" />
                </div>
                <input required type="email" placeholder="Email professionnel *" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} style={champ} aria-label="Email" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
                  <input type="tel" placeholder="Téléphone" value={f.telephone} onChange={(e) => setF({ ...f, telephone: e.target.value })} style={champ} aria-label="Téléphone" />
                  <select value={f.effectif} onChange={(e) => setF({ ...f, effectif: e.target.value })} style={champ} aria-label="Effectif">
                    <option value="">Effectif…</option>
                    {EFFECTIFS.map((x) => <option key={x} value={x}>{x} salariés</option>)}
                  </select>
                </div>
                <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                  <legend style={{ fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>Vos besoins</legend>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {BESOINS.map((x) => {
                      const pris = besoins.includes(x);
                      return (
                        <button key={x} type="button" aria-pressed={pris} onClick={() => setBesoins(pris ? besoins.filter((y) => y !== x) : [...besoins, x])}
                          style={{ border: `1px solid ${pris ? "#f97316" : "#d1d5db"}`, background: pris ? "#fff7ed" : "#ffffff", color: pris ? "#c2410c" : "#374151", borderRadius: "999px", padding: "5px 12px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                          {pris ? "✓ " : ""}{x}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <textarea rows={3} placeholder="Message (facultatif)" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} style={{ ...champ, resize: "vertical" }} aria-label="Message" />
                <input tabIndex={-1} autoComplete="off" value={f.siteWeb} onChange={(e) => setF({ ...f, siteWeb: e.target.value })} style={{ position: "absolute", left: "-9999px" }} aria-hidden="true" />
                {etat && !etat.ok && <p style={{ margin: 0, color: "#b91c1c", fontWeight: 600, fontSize: "14px" }}>{etat.texte}</p>}
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setOuvert(false)} style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px 16px", fontWeight: 600, cursor: "pointer" }}>Annuler</button>
                  <button type="submit" disabled={envoi} style={{ background: "#f97316", color: "#ffffff", border: "none", borderRadius: "8px", padding: "10px 18px", fontWeight: 800, cursor: "pointer", opacity: envoi ? 0.6 : 1 }}>{envoi ? "Envoi…" : "Envoyer"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
