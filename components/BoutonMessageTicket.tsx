"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BoutonMessageTicket({
  ticketId,
  role,
  auteur,
}: {
  ticketId: string;
  role: "CLIENT" | "ADMIN";
  auteur: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);

  async function handleEnvoyer() {
    if (!message.trim()) return;
    setChargement(true);

    await fetch(`/api/tickets/${ticketId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenu: message, auteur, role }),
    });

    setMessage("");
    router.refresh();
    setChargement(false);
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="font-bold mb-4">✉️ Répondre</h2>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full border rounded-lg px-4 py-3 h-28 resize-none mb-4"
        placeholder="Votre message..."
      />
      <button
        onClick={handleEnvoyer}
        disabled={chargement || !message.trim()}
        className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-40"
      >
        {chargement ? "Envoi..." : "📤 Envoyer"}
      </button>
    </div>
  );
}