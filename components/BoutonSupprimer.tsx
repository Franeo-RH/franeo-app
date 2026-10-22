"use client";

import { useRouter } from "next/navigation";

export default function BoutonSupprimer({
  id,
  redirectUrl,
}: {
  id: string;
  redirectUrl: string;
}) {
  const router = useRouter();

  async function handleSupprimer() {
    const confirmation = confirm(
      "Êtes-vous sûr de vouloir supprimer ce salarié ?"
    );
    if (!confirmation) return;

    const res = await fetch(`/api/salaries/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      router.push(redirectUrl);
    }
  }

  return (
    <button
      onClick={handleSupprimer}
      className="bg-red-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-red-600 transition"
    >
      🗑️ Supprimer
    </button>
  );
}