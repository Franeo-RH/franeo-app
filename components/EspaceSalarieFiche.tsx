"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Bloc de la fiche salarié : créer le lien d'accès, en générer un nouveau ou couper l'accès */
export default function EspaceSalarieFiche({
  salarieId,
  email,
  statut,
}: {
  salarieId: string;
  email: string | null;
  statut: "aucun" | "actif" | "coupe";
}) {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState("");
  const [lien, setLien] = useState("");

  async function appeler(methode: "POST" | "DELETE") {
    if (methode === "DELETE" && !confirm("Couper l'accès de ce salarié à son espace ?")) return;
    setChargement(true);
    setMessage("");
    const res = await fetch(`/api/salaries/${salarieId}/espace`, { method: methode });
    const data = await res.json().catch(() => ({}));
    setChargement(false);
    if (!res.ok) {
      setMessage(`❌ ${data.erreur || "Erreur"}`);
      return;
    }
    if (methode === "POST") {
      setLien(data.lien || "");
      setMessage(`✅ Lien créé pour ${data.email}. Copiez-le et transmettez-le au salarié (SMS, WhatsApp, mail…).`);
    } else {
      setLien("");
      setMessage("Accès coupé.");
    }
    router.refresh();
  }

  const bouton = (label: string, methode: "POST" | "DELETE", fond: string) => (
    <button type="button" onClick={() => appeler(methode)} disabled={chargement} style={{ background: fond, color: "#ffffff", border: "none", borderRadius: "8px", padding: "9px 14px", fontWeight: 600, fontSize: "14px", cursor: "pointer", opacity: chargement ? 0.6 : 1 }}>
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <p style={{ margin: 0, fontSize: "14px", color: "#4b5563" }}>
        {statut === "actif"
          ? "✅ Ce salarié a accès à son espace : il déclare ses congés et absences, vous les validez."
          : statut === "coupe"
            ? "⏸️ L'accès de ce salarié est coupé."
            : "Ce salarié n'a pas encore d'espace. Créez son lien d'accès et transmettez-le-lui : il y choisira son mot de passe."}
      </p>
      {!email && statut === "aucun" && (
        <p style={{ margin: 0, fontSize: "13px", color: "#b45309" }}>Renseignez d&apos;abord son email dans la fiche.</p>
      )}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {statut === "aucun" && bouton("🔗 Créer le lien d'accès", "POST", "#f97316")}
        {statut === "actif" && bouton("🔗 Nouveau lien", "POST", "#4b5563")}
        {statut === "actif" && bouton("Couper l'accès", "DELETE", "#ef4444")}
        {statut === "coupe" && bouton("Rétablir l'accès", "POST", "#16a34a")}
      </div>
      {message && <p style={{ margin: 0, fontSize: "14px" }}>{message}</p>}
      {lien && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <input readOnly value={lien} aria-label="Lien d'invitation" onFocus={(e) => e.target.select()} style={{ flex: "1 1 220px", minWidth: 0, border: "1px solid #d1d5db", borderRadius: "8px", padding: "8px", fontSize: "13px" }} />
          <button type="button" onClick={() => { navigator.clipboard?.writeText(lien); setMessage("📋 Lien copié : envoyez-le au salarié. Il est valable 7 jours."); }} style={{ background: "#111827", color: "#ffffff", border: "none", borderRadius: "8px", padding: "8px 12px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
            📋 Copier le lien
          </button>
        </div>
      )}
      <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>
        Le lien est valable 7 jours. Le salarié l&apos;ouvre, choisit son mot de passe, puis se connecte sur la page de connexion habituelle de Franeo avec son email.
      </p>
    </div>
  );
}
