"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BoutonsEntreprise({
  id,
  nom,
  actif,
}: {
  id: string;
  nom: string;
  actif: boolean;
}) {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);

  async function changerStatut() {
    let motif = "";
    if (actif) {
      const saisie = prompt(
        `Suspendre ${nom} ?\nLes utilisateurs ne pourront plus se connecter, mais toutes les données sont conservées.\n\nMotif (impayé, suspension, arrêt de la prestation…) :`,
        ""
      );
      if (saisie === null) return;
      motif = saisie;
    } else if (!confirm(`Réactiver l'accès de ${nom} ?`)) {
      return;
    }

    setChargement(true);
    const res = await fetch(`/api/entreprises/${id}/statut`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: !actif, motif }),
    });
    setChargement(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.erreur || "Erreur lors du changement de statut");
      return;
    }
    router.refresh();
  }

  async function supprimer() {
    const saisie = prompt(
      `⚠️ SUPPRESSION DÉFINITIVE de ${nom} : salariés, variables, factures, tickets et accès seront effacés, sans retour possible.\n\nPour garder les données, utilisez plutôt « Suspendre ».\n\nTapez le nom exact de l'entreprise pour confirmer :`
    );
    if (saisie === null) return;
    if (saisie.trim() !== nom.trim()) {
      alert("Le nom saisi ne correspond pas : suppression annulée.");
      return;
    }

    setChargement(true);
    const res = await fetch(`/api/entreprises/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.erreur || "Erreur lors de la suppression");
      setChargement(false);
      return;
    }
    router.push("/admin/entreprises");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={changerStatut}
        disabled={chargement}
        style={{ backgroundColor: actif ? "#eab308" : "#22c55e", color: "#ffffff" }}
        className="px-5 py-2 rounded-lg font-semibold transition disabled:opacity-50 hover:opacity-90"
      >
        {actif ? "⏸️ Suspendre" : "▶️ Réactiver"}
      </button>
      <button
        onClick={supprimer}
        disabled={chargement}
        style={{ backgroundColor: "#ef4444", color: "#ffffff" }}
        className="px-5 py-2 rounded-lg font-semibold transition disabled:opacity-50 hover:opacity-90"
      >
        🗑️ Supprimer
      </button>
    </>
  );
}
