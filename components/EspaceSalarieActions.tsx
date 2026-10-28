"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TYPES_ABSENCE_SALARIE } from "@/lib/espace-salarie";

/** Formulaire de demande d'absence + boutons « Annuler » et « Déconnexion » de l'espace salarié */
export function FormulaireAbsenceSalarie() {
  const router = useRouter();
  const [form, setForm] = useState({ type: "CONGE_PAYE", dateDebut: "", dateFin: "", commentaire: "" });
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setMessage(null);
    const res = await fetch("/api/espace-salarie/absences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setEnvoi(false);
    if (!res.ok) {
      setMessage({ ok: false, texte: data.erreur || "La demande n'a pas pu être envoyée." });
      return;
    }
    setMessage({ ok: true, texte: "✅ Demande envoyée à votre employeur." });
    setForm({ type: "CONGE_PAYE", dateDebut: "", dateFin: "", commentaire: "" });
    router.refresh();
  }

  const champ: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #d1d5db", borderRadius: "10px", padding: "12px", fontSize: "16px", background: "#ffffff", marginTop: "4px" };
  const label: React.CSSProperties = { display: "block", fontSize: "14px", fontWeight: 600, color: "#374151" };

  return (
    <form onSubmit={envoyer} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <label style={label}>
        Type d&apos;absence
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={champ}>
          {TYPES_ABSENCE_SALARIE.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
        <label style={label}>
          Du
          <input type="date" required value={form.dateDebut} onChange={(e) => setForm({ ...form, dateDebut: e.target.value })} style={champ} />
        </label>
        <label style={label}>
          Au
          <input type="date" required min={form.dateDebut} value={form.dateFin} onChange={(e) => setForm({ ...form, dateFin: e.target.value })} style={champ} />
        </label>
      </div>
      <label style={label}>
        Message (facultatif)
        <textarea rows={2} value={form.commentaire} onChange={(e) => setForm({ ...form, commentaire: e.target.value })} style={{ ...champ, resize: "none" }} />
      </label>
      <button type="submit" disabled={envoi} style={{ background: "#f97316", color: "#ffffff", border: "none", borderRadius: "10px", padding: "14px", fontSize: "16px", fontWeight: 700, cursor: "pointer", opacity: envoi ? 0.6 : 1 }}>
        {envoi ? "Envoi…" : "Envoyer la demande"}
      </button>
      {message && <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: message.ok ? "#15803d" : "#b91c1c" }}>{message.texte}</p>}
      <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Arrêt maladie, congé exceptionnel ou absence non rémunérée : prévenez directement votre employeur, qui l&apos;enregistre.</p>
    </form>
  );
}

export function BoutonAnnulerAbsence({ id }: { id: string }) {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);
  async function annuler() {
    if (!confirm("Annuler cette demande ?")) return;
    setChargement(true);
    const res = await fetch(`/api/espace-salarie/absences/${id}`, { method: "DELETE" });
    setChargement(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.erreur || "Annulation impossible");
    }
    router.refresh();
  }
  return (
    <button type="button" onClick={annuler} disabled={chargement} style={{ background: "none", border: "1px solid #d1d5db", borderRadius: "8px", padding: "6px 10px", fontSize: "13px", cursor: "pointer" }}>
      Annuler
    </button>
  );
}

export function BoutonDeconnexionSalarie() {
  const router = useRouter();
  async function sortir() {
    try {
      const cles = await caches.keys();
      await Promise.all(cles.filter((k) => k.startsWith("franeo-pages")).map((k) => caches.delete(k)));
    } catch {}
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button type="button" onClick={sortir} style={{ background: "none", border: "1px solid #4b5563", color: "#ffffff", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", cursor: "pointer" }}>
      Déconnexion
    </button>
  );
}
