"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { THEMATIQUES } from "@/lib/actualites";

export default function FormulaireActualite() {
  const router = useRouter();
  const [form, setForm] = useState({ titre: "", contenu: "", thematique: "Général" });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur("");
    setSucces("");

    const res = await fetch("/api/actualites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      let message = "Une erreur est survenue";
      try {
        const data = await res.json();
        message = data.erreur || message;
      } catch {}
      setErreur(message);
      setChargement(false);
      return;
    }

    setForm({ titre: "", contenu: "", thematique: form.thematique });
    setSucces("✅ Actualité publiée !");
    setChargement(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-6">
      <div className="col-span-2">
        <label className="block text-sm font-semibold mb-1">Titre *</label>
        <input
          type="text"
          value={form.titre}
          onChange={(e) => setForm({ ...form, titre: e.target.value })}
          className="w-full border rounded-lg px-4 py-3"
          placeholder="Ex: Nouveau barème des indemnités kilométriques"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Thématique *</label>
        <select
          value={form.thematique}
          onChange={(e) => setForm({ ...form, thematique: e.target.value })}
          className="w-full border rounded-lg px-4 py-3"
        >
          {THEMATIQUES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="col-span-3">
        <label className="block text-sm font-semibold mb-1">Contenu *</label>
        <textarea
          value={form.contenu}
          onChange={(e) => setForm({ ...form, contenu: e.target.value })}
          className="w-full border rounded-lg px-4 py-3 h-40 resize-y"
          placeholder="Rédige ton actualité..."
          required
        />
      </div>

      {erreur && <p className="col-span-3 text-red-500 font-semibold">{erreur}</p>}
      {succes && <p className="col-span-3 text-green-600 font-semibold">{succes}</p>}

      <div className="col-span-3 flex justify-end">
        <button
          type="submit"
          disabled={chargement}
          className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-50"
        >
          {chargement ? "Publication..." : "📰 Publier"}
        </button>
      </div>
    </form>
  );
}