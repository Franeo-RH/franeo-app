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

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.demande) {
      // Client « paie » : la suppression attend la validation du gestionnaire
      alert(data.message || "Votre demande de suppression a été envoyée.");
      router.push("/client/salaries/demandes?envoyee=1");
      return;
    }
    if (res.ok) {
      router.push(redirectUrl);
    } else {
      alert(data.erreur || "Suppression impossible.");
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