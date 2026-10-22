"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { THEMATIQUES } from "@/lib/actualites";

type Actualite = {
  id: string;
  titre: string;
  contenu: string;
  thematique: string;
  createdAt: string;
};

export default function ActualiteAdminCarte({ actualite }: { actualite: Actualite }) {
  const router = useRouter();
  const [edition, setEdition] = useState(false);
  const [form, setForm] = useState({
    titre: actualite.titre,
    contenu: actualite.contenu,
    thematique: actualite.thematique,
  });
  const [chargement, setChargement] = useState(false);

  async function handleSauvegarder() {
    setChargement(true);
    await fetch(`/api/actualites/${actualite.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setChargement(false);
    setEdition(false);
    router.refresh();
  }

  async function handleSupprimer() {
    if (!confirm(`Supprimer l'actualité "${actualite.titre}" ?`)) return;
    setChargement(true);
    await fetch(`/api/actualites/${actualite.id}`, { method: "DELETE" });
    setChargement(false);
    router.refresh();
  }

  if (edition) {
    return (
      <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4">
          <input
            type="text"
            value={form.titre}
            onChange={(e) => setForm({ ...form, titre: e.target.value })}
            className="col-span-2 border rounded-lg px-4 py-3"
          />
          <select
            value={form.thematique}
            onChange={(e) => setForm({ ...form, thematique: e.target.value })}
            className="border rounded-lg px-4 py-3"
          >
            {THEMATIQUES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <textarea
          value={form.contenu}
          onChange={(e) => setForm({ ...form, contenu: e.target.value })}
          className="border rounded-lg px-4 py-3 h-40 resize-y"
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setEdition(false)}
            className="bg-white border px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Annuler
          </button>
          <button
            onClick={handleSauvegarder}
            disabled={chargement}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-50"
          >
            {chargement ? "..." : "✅ Enregistrer"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-600">
            {actualite.thematique}
          </span>
          <h3 className="text-xl font-bold mt-3">{actualite.titre}</h3>
          <p className="text-gray-400 text-sm mt-1">
            {new Date(actualite.createdAt).toLocaleDateString("fr-FR")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEdition(true)}
            className="bg-gray-600 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-gray-700 transition"
          >
            ✏️ Modifier
          </button>
          <button
            onClick={handleSupprimer}
            disabled={chargement}
            className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50"
          >
            🗑️ Supprimer
          </button>
        </div>
      </div>
      <p className="text-gray-600 mt-4 whitespace-pre-line">{actualite.contenu}</p>
    </div>
  );
}