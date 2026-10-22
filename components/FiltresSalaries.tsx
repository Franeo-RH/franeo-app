"use client";

import { useRouter } from "next/navigation";

export default function FiltresSalaries({
  entreprises,
  filtreActuel,
}: {
  entreprises: { id: string; nom: string }[];
  filtreActuel: string;
}) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val) {
      router.push(`/admin/salaries?entreprise=${val}`);
    } else {
      router.push("/admin/salaries");
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 mb-6 flex gap-4 items-center">
      <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Filtrer par client :</label>
      <select
        value={filtreActuel}
        onChange={handleChange}
        className="flex-1 border rounded-lg px-4 py-2 text-sm"
      >
        <option value="">Tous les clients</option>
        {entreprises.map(e => (
          <option key={e.id} value={e.id}>{e.nom}</option>
        ))}
      </select>
      {filtreActuel && (
        <button
          onClick={() => router.push("/admin/salaries")}
          className="text-sm text-gray-500 hover:text-red-500 font-semibold transition"
        >
          ✕ Réinitialiser
        </button>
      )}
    </div>
  );
}