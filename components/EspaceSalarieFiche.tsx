"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Bloc de la fiche salarié (côté client) : inviter, renvoyer l'invitation ou couper l'accès */
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
    setMessage(methode === "POST" ? `✅ Invitation envoyée à ${data.email}` : "Accès coupé.");
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
            : "Ce salarié n'a pas encore d'espace. Il recevra un mail pour créer son mot de passe."}
      </p>
      {!email && statut === "aucun" && (
        <p style={{ margin: 0, fontSize: "13px", color: "#b45309" }}>Renseignez d&apos;abord son email dans la fiche.</p>
      )}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {statut === "aucun" && bouton("📱 Inviter le salarié", "POST", "#f97316")}
        {statut === "actif" && bouton("Renvoyer l'invitation", "POST", "#4b5563")}
        {statut === "actif" && bouton("Couper l'accès", "DELETE", "#ef4444")}
        {statut === "coupe" && bouton("Rétablir l'accès", "POST", "#16a34a")}
      </div>
      {message && <p style={{ margin: 0, fontSize: "14px" }}>{message}</p>}
    </div>
  );
}
