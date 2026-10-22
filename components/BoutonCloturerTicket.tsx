"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BoutonCloturerTicket({
  ticketId,
  statut,
}: {
  ticketId: string;
  statut: string;
}) {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);

  async function handleAction() {
    const nouveauStatut = statut === "Clôturé" ? "Ouvert" : "Clôturé";
    const confirmation = confirm(
      statut === "Clôturé"
        ? "Rouvrir ce ticket ?"
        : "Êtes-vous sûr de vouloir clôturer ce ticket ?"
    );
    if (!confirmation) return;

    setChargement(true);

    await fetch(`/api/tickets/${ticketId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: nouveauStatut }),
    });

    router.refresh();
    setChargement(false);
  }

  return (
    <button
      onClick={handleAction}
      disabled={chargement}
      className={`text-white px-5 py-2 rounded-lg font-semibold transition ${
        statut === "Clôturé"
          ? "bg-green-600 hover:bg-green-700"
          : "bg-gray-600 hover:bg-gray-700"
      }`}
    >
      {chargement ? "..." : statut === "Clôturé" ? "🔓 Rouvrir" : "🔒 Clôturer"}
    </button>
  );
}