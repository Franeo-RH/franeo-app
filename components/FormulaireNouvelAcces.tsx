"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormulaireNouvelAcces({ entrepriseId }: { entrepriseId: string }) {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  const [form, setForm] = useState({
    prenom: "",
    email: "",
    motDePasse: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur("");
    setSucces("");

    const res = await fetch("/api/utilisateurs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, entrepriseId }),
    });

    const data = await res.json();

    if (!res.ok) {
      setErreur(data.erreur || "Une erreur est survenue");
      setChargement(false);
      return;
    }

    setSucces("Accès créé avec succès !");
    setForm({ prenom: "", email: "", motDePasse: "" });
    router.refresh();
    setChargement(false);
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-semibold mb-1">Prénom *</label>
        <input
          type="text"
          name="prenom"
          value={form.prenom}
          onChange={handleChange}
          className="w-full border rounded-lg px-4 py-3"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Email *</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          className="w-full border rounded-lg px-4 py-3"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1">Mot de passe *</label>
        <input
          type="password"
          name="motDePasse"
          value={form.motDePasse}
          onChange={handleChange}
          className="w-full border rounded-lg px-4 py-3"
          required
        />
      </div>

      {erreur && <p className="col-span-2 text-red-500">{erreur}</p>}
      {succes && <p className="col-span-2 text-green-500">{succes}</p>}

      <div className="col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={chargement}
          className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition"
        >
          {chargement ? "Création..." : "✅ Créer l'accès"}
        </button>
      </div>
    </form>
  );
}