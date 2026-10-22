"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function ProfilClient() {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [prenom, setPrenom] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);

  const [form, setForm] = useState({
    motDePasseActuel: "",
    nouveauMotDePasse: "",
    confirmation: "",
  });

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(data => {
      if (data.prenom) setPrenom(data.prenom);
      if (data.permissions) setPermissions(data.permissions);
    });
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    setSucces("");

    if (form.nouveauMotDePasse !== form.confirmation) {
      setErreur("Les mots de passe ne correspondent pas");
      return;
    }

    if (form.nouveauMotDePasse.length < 6) {
      setErreur("Le nouveau mot de passe doit faire au moins 6 caractères");
      return;
    }

    setChargement(true);

    const res = await fetch("/api/auth/changer-mot-de-passe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        motDePasseActuel: form.motDePasseActuel,
        nouveauMotDePasse: form.nouveauMotDePasse,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setErreur(data.erreur || "Une erreur est survenue");
    } else {
      setSucces("Mot de passe modifié avec succès !");
      setForm({ motDePasseActuel: "", nouveauMotDePasse: "", confirmation: "" });
    }

    setChargement(false);
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="CLIENT" prenom={prenom} permissions={permissions} />
      <main className="p-10 max-w-xl mx-auto">

        <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">🔒 Mon mot de passe</h1>
          <button
            onClick={() => router.back()}
            className="bg-white border px-5 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            ← Retour
          </button>
        </div>

        <div className="bg-white rounded-xl shadow p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">

            <div>
              <label className="block text-sm font-semibold mb-1">Mot de passe actuel *</label>
              <input
                type="password"
                name="motDePasseActuel"
                value={form.motDePasseActuel}
                onChange={handleChange}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-orange-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Nouveau mot de passe *</label>
              <input
                type="password"
                name="nouveauMotDePasse"
                value={form.nouveauMotDePasse}
                onChange={handleChange}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-orange-500 focus:outline-none"
                placeholder="Au moins 6 caractères"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Confirmation *</label>
              <input
                type="password"
                name="confirmation"
                value={form.confirmation}
                onChange={handleChange}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-orange-500 focus:outline-none"
                placeholder="Répétez le nouveau mot de passe"
                required
              />
            </div>

            {erreur && <p className="text-red-500">{erreur}</p>}
            {succes && <p className="text-green-500">{succes}</p>}

            <button
              type="submit"
              disabled={chargement}
              className="bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition"
            >
              {chargement ? "Enregistrement..." : "✅ Modifier mon mot de passe"}
            </button>

          </form>
        </div>

      </main>
    </div>
  );
}