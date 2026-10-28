"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LIBELLES_CHAMPS, MODIFIABLES } from "@/lib/admin-champs";

const btn = (fond: string, texte = "#ffffff", bord = fond): React.CSSProperties => ({
  background: fond, color: texte, border: `1px solid ${bord}`, borderRadius: "8px", padding: "7px 12px", fontWeight: 700, fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap",
});

/** Export Excel complet (toutes les colonnes, plusieurs feuilles) ; reprend le filtre entreprise / mois de la page */
export function BoutonExportComplet({ jeu, label = "📥 Export complet" }: { jeu: string; label?: string }) {
  const sp = useSearchParams();
  const [charge, setCharge] = useState(false);
  async function exporter() {
    setCharge(true);
    const q = new URLSearchParams({ jeu });
    const ent = sp.get("entrepriseId") || sp.get("entreprise");
    if (ent) q.set("entrepriseId", ent);
    const m = sp.get("mois");
    const a = sp.get("annee");
    if (m && /^\d{4}-\d{2}$/.test(m)) q.set("mois", m);
    else if (m && a) q.set("mois", `${a}-${String(m).padStart(2, "0")}`);
    try {
      const res = await fetch(`/api/admin/export?${q}`);
      if (!res.ok) { alert("Export impossible"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = (res.headers.get("Content-Disposition") || "").match(/filename="(.+)"/)?.[1] || `franeo-${jeu}.xlsx`;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      URL.revokeObjectURL(url);
    } finally {
      setCharge(false);
    }
  }
  return <button type="button" onClick={exporter} disabled={charge} style={btn("#ffffff", "#15803d", "#16a34a")}>{charge ? "Export…" : label}</button>;
}

/** Import Excel admin (absences, variables, échéances) avec modèle à télécharger */
export function BoutonImportAdmin({ jeu, label = "📤 Importer" }: { jeu: "absences" | "variables" | "echeances"; label?: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<{ crees: number; erreurs: { ligne: number; raison: string }[] } | null>(null);
  const [erreur, setErreur] = useState("");

  async function envoyer() {
    if (!fichier) return;
    setEnvoi(true);
    setErreur("");
    setResultat(null);
    const form = new FormData();
    form.append("jeu", jeu);
    form.append("fichier", fichier);
    const res = await fetch("/api/admin/import", { method: "POST", body: form });
    const d = await res.json().catch(() => ({}));
    setEnvoi(false);
    if (!res.ok) { setErreur(d.erreur || "Import impossible"); return; }
    setResultat(d);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOuvert(true)} style={btn("#ffffff", "#c2410c", "#f97316")}>{label}</button>
      {ouvert && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }} onClick={() => setOuvert(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#ffffff", borderRadius: "16px", padding: "20px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700 }}>📤 Importer ({jeu})</h2>
            <p style={{ margin: "0 0 12px", fontSize: "14px", color: "#4b5563" }}>1. Téléchargez le modèle, remplissez une ligne par élément. 2. Envoyez le fichier.</p>
            <a href={`/api/admin/import?jeu=${jeu}`} style={{ ...btn("#f3f4f6", "#111827", "#e5e7eb"), display: "inline-block", textDecoration: "none", marginBottom: "12px" }}>📥 Télécharger le modèle</a>
            <input type="file" accept=".xlsx" onChange={(e) => setFichier(e.target.files?.[0] ?? null)} style={{ display: "block", marginBottom: "12px" }} aria-label="Fichier Excel" />
            {erreur && <p style={{ color: "#b91c1c", fontSize: "14px", fontWeight: 600 }}>❌ {erreur}</p>}
            {resultat && (
              <div style={{ fontSize: "14px", marginBottom: "12px" }}>
                <p style={{ color: "#15803d", fontWeight: 700, margin: 0 }}>✅ {resultat.crees} ligne(s) importée(s)</p>
                {resultat.erreurs.length > 0 && (
                  <ul style={{ color: "#b91c1c", margin: "6px 0 0", paddingLeft: "18px", maxHeight: "160px", overflowY: "auto" }}>
                    {resultat.erreurs.map((e, i) => <li key={i}>Ligne {e.ligne} : {e.raison}</li>)}
                  </ul>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setOuvert(false)} style={btn("#ffffff", "#111827", "#d1d5db")}>Fermer</button>
              <button type="button" onClick={envoyer} disabled={!fichier || envoi} style={{ ...btn("#f97316"), opacity: !fichier || envoi ? 0.5 : 1 }}>{envoi ? "Import…" : "Importer"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Supprimer un élément (admin) */
export function BoutonSupprimerAdmin({ modele, id, quoi = "cet élément", compact = true }: { modele: string; id: string; quoi?: string; compact?: boolean }) {
  const router = useRouter();
  const [charge, setCharge] = useState(false);
  async function supprimer() {
    if (!confirm(`Supprimer ${quoi} ? Cette action est définitive.`)) return;
    setCharge(true);
    const res = await fetch("/api/admin/supprimer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modele, id }) });
    setCharge(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.erreur || "Suppression impossible"); return; }
    router.refresh();
  }
  return <button type="button" onClick={supprimer} disabled={charge} title="Supprimer" aria-label={`Supprimer ${quoi}`} style={btn("#fee2e2", "#b91c1c", "#fecaca")}>{compact ? "🗑️" : "🗑️ Supprimer"}</button>;
}

/** Modifier un élément (admin) : formulaire généré à partir des champs autorisés */
export function BoutonModifierAdmin({ modele, id, valeurs, onFait }: { modele: string; id: string; valeurs: Record<string, string | number | boolean | null | Date | undefined>; onFait?: () => void }) {
  const router = useRouter();
  const champs = MODIFIABLES[modele] || {};
  const versTexte = (v: unknown, t: string) => {
    if (v === null || v === undefined) return "";
    if (t === "date") { const d = new Date(v as string); return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10); }
    return String(v);
  };
  const initial = Object.fromEntries(Object.entries(champs).map(([k, c]) => [k, c.type === "booleen" ? !!valeurs[k] : versTexte(valeurs[k], c.type)]));
  const [ouvert, setOuvert] = useState(false);
  const [form, setForm] = useState<Record<string, string | boolean>>(initial);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  async function enregistrer() {
    setEnvoi(true);
    setErreur("");
    const res = await fetch("/api/admin/modifier", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modele, id, data: form }) });
    const d = await res.json().catch(() => ({}));
    setEnvoi(false);
    if (!res.ok) { setErreur(d.erreur || "Erreur"); return; }
    setOuvert(false);
    onFait?.();
    router.refresh();
  }

  const champStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #d1d5db", borderRadius: "8px", padding: "8px 10px", fontSize: "15px", marginTop: "4px" };
  return (
    <>
      <button type="button" onClick={() => { setForm(initial); setOuvert(true); }} title="Modifier" aria-label="Modifier" style={btn("#f3f4f6", "#111827", "#e5e7eb")}>✏️</button>
      {ouvert && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }} onClick={() => setOuvert(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#ffffff", borderRadius: "16px", padding: "20px", width: "100%", maxWidth: "440px", maxHeight: "90vh", overflowY: "auto", textAlign: "left" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 700 }}>✏️ Modifier</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {Object.entries(champs).map(([k, c]) => (
                <label key={k} style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>
                  {LIBELLES_CHAMPS[k] ?? k}
                  {c.type === "liste" ? (
                    <select value={String(form[k])} onChange={(e) => setForm({ ...form, [k]: e.target.value })} style={champStyle}>
                      {c.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : c.type === "booleen" ? (
                    <input type="checkbox" checked={!!form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} style={{ marginLeft: "8px" }} />
                  ) : (
                    <input type={c.type === "date" ? "date" : c.type === "nombre" ? "text" : "text"} inputMode={c.type === "nombre" ? "decimal" : undefined} value={String(form[k] ?? "")} onChange={(e) => setForm({ ...form, [k]: e.target.value })} style={champStyle} />
                  )}
                </label>
              ))}
            </div>
            {erreur && <p style={{ color: "#b91c1c", fontSize: "14px", fontWeight: 600 }}>❌ {erreur}</p>}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "14px" }}>
              <button type="button" onClick={() => setOuvert(false)} style={btn("#ffffff", "#111827", "#d1d5db")}>Annuler</button>
              <button type="button" onClick={enregistrer} disabled={envoi} style={{ ...btn("#f97316"), opacity: envoi ? 0.6 : 1 }}>{envoi ? "…" : "Enregistrer"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
