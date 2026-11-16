"use client";

// Espace salarié : déclarer un accident du travail ou de trajet, et suivre ses déclarations.

import { useCallback, useEffect, useState } from "react";
import { STATUTS_AT, TYPES_AT } from "@/lib/accidents";

type Declaration = { id: string; type: string; dateAccident: string; heure: string | null; lieu: string | null; statut: string };

const champ: React.CSSProperties = { width: "100%", border: "1px solid #d1d5db", borderRadius: "10px", padding: "10px 12px", fontSize: "15px", boxSizing: "border-box", marginTop: "4px" };
const etiquette: React.CSSProperties = { display: "block", fontSize: "14px", fontWeight: 600, color: "#374151" };

export default function AccidentSalarie() {
  const vide = { type: "TRAVAIL", dateAccident: new Date().toISOString().slice(0, 10), heure: "", lieu: "", activite: "", circonstances: "", siegeLesions: "", natureLesions: "", temoins: "", premierePersonne: "", soins: "", arret: false, tiers: "" };
  const [f, setF] = useState(vide);
  const [liste, setListe] = useState<Declaration[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const charger = useCallback(async () => {
    const d = await fetch("/api/espace-salarie/accidents").then((r) => (r.ok ? r.json() : [])).catch(() => []);
    setListe(Array.isArray(d) ? d : []);
  }, []);
  useEffect(() => { charger(); }, [charger]);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true); setMsg(null);
    const r = await fetch("/api/espace-salarie/accidents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const j = await r.json().catch(() => ({}));
    setEnvoi(false);
    if (!r.ok) { setMsg({ ok: false, t: j.erreur || "Erreur" }); return; }
    setMsg({ ok: true, t: "✅ Déclaration envoyée à votre employeur. Il la transmettra à la CPAM." });
    setF(vide); setOuvert(false); charger();
  }

  const texte = (k: keyof typeof vide, label: string, aide?: string, long = false) => (
    <label style={etiquette}>{label}
      {long
        ? <textarea value={String(f[k])} onChange={(e) => setF({ ...f, [k]: e.target.value })} rows={3} style={champ} />
        : <input value={String(f[k])} onChange={(e) => setF({ ...f, [k]: e.target.value })} style={champ} />}
      {aide && <span style={{ display: "block", fontSize: "12px", fontWeight: 400, color: "#6b7280", marginTop: "2px" }}>{aide}</span>}
    </label>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <p style={{ margin: 0, fontSize: "14px", color: "#4b5563" }}>
        Vous avez eu un accident sur votre lieu de travail ou sur le trajet ? Prévenez votre employeur au plus vite (dans les 24 heures). Si vous consultez un médecin, il établit le certificat médical : envoyez votre arrêt éventuel avec « Déclarer un arrêt de travail ».
      </p>
      {!ouvert ? (
        <button type="button" onClick={() => setOuvert(true)} style={{ alignSelf: "flex-start", background: "#dc2626", color: "#ffffff", border: "none", borderRadius: "10px", padding: "12px 18px", fontWeight: 700, fontSize: "15px" }}>🩹 Déclarer un accident</button>
      ) : (
        <form onSubmit={envoyer} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {Object.entries(TYPES_AT).map(([k, v]) => (
              <button key={k} type="button" onClick={() => setF({ ...f, type: k })} style={{ flex: 1, minWidth: "150px", padding: "10px", borderRadius: "10px", fontWeight: 700, border: `2px solid ${f.type === k ? "#f97316" : "#e5e7eb"}`, background: f.type === k ? "#fff7ed" : "#ffffff" }}>{k === "TRAVAIL" ? "🏭" : "🚗"} {v}</button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <label style={etiquette}>Date<input type="date" required value={f.dateAccident} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setF({ ...f, dateAccident: e.target.value })} style={champ} /></label>
            <label style={etiquette}>Heure<input type="time" value={f.heure} onChange={(e) => setF({ ...f, heure: e.target.value })} style={champ} /></label>
          </div>
          {texte("lieu", "Où ?", f.type === "TRAJET" ? "Ex. : rond-point de la rue X, sur le trajet domicile → travail" : "Ex. : atelier, entrepôt, chez le client Y")}
          {texte("activite", "Que faisiez-vous à ce moment-là ?")}
          {texte("circonstances", "Que s'est-il passé ? *", "Décrivez simplement : le geste, l'objet ou la machine, comment c'est arrivé.", true)}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {texte("siegeLesions", "Partie du corps touchée", "Ex. : main droite")}
            {texte("natureLesions", "Type de blessure", "Ex. : coupure, entorse")}
          </div>
          {texte("temoins", "Témoins (nom et téléphone)", undefined, true)}
          {texte("premierePersonne", "Qui avez-vous prévenu en premier ?")}
          {texte("soins", "Avez-vous vu un médecin ou été à l'hôpital ?")}
          {f.type === "TRAJET" && texte("tiers", "Autre personne ou véhicule en cause (nom, assurance)", undefined, true)}
          <label style={{ ...etiquette, display: "flex", gap: "8px", alignItems: "center" }}><input type="checkbox" checked={f.arret} onChange={(e) => setF({ ...f, arret: e.target.checked })} /> Le médecin m&apos;a prescrit un arrêt de travail</label>
          {msg && !msg.ok && <p style={{ margin: 0, color: "#b91c1c", fontSize: "14px" }}>{msg.t}</p>}
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="submit" disabled={envoi} style={{ background: "#111827", color: "#ffffff", border: "none", borderRadius: "10px", padding: "12px 18px", fontWeight: 700 }}>{envoi ? "Envoi…" : "Envoyer à mon employeur"}</button>
            <button type="button" onClick={() => setOuvert(false)} style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: "10px", padding: "12px 18px" }}>Annuler</button>
          </div>
        </form>
      )}
      {msg?.ok && <p style={{ margin: 0, color: "#15803d", fontSize: "14px", fontWeight: 600 }}>{msg.t}</p>}
      {liste.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {liste.map((d) => {
            const st = STATUTS_AT[d.statut] ?? STATUTS_AT.A_DECLARER;
            return (
              <li key={d.id} style={{ borderTop: "1px solid #f3f4f6", padding: "10px 0", display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", fontSize: "14px" }}>
                <span><strong>{TYPES_AT[d.type]}</strong> du {new Date(d.dateAccident).toLocaleDateString("fr-FR")}{d.lieu ? ` · ${d.lieu}` : ""}</span>
                <span style={{ background: st.fond, color: st.texte, borderRadius: "999px", padding: "3px 10px", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap" }}>{st.label.replace("⏳ À déclarer à la CPAM", "⏳ Reçu par l'employeur")}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
