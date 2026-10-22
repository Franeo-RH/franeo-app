"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

const CATEGORIES = [
  { value: "BUG", label: "🐛 Bug" },
  { value: "QUESTION", label: "❓ Question" },
  { value: "SUGGESTION", label: "💡 Suggestion" },
  { value: "PROBLEME_TECHNIQUE", label: "⚙️ Problème technique" },
];

export default function NouveauTicketSupport() {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [prenom, setPrenom] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);

  const [form, setForm] = useState({
    titre: "",
    description: "",
    categorie: "BUG",
  });

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(data => {
      if (data.prenom) setPrenom(data.prenom);
      if (data.permissions) setPermissions(data.permissions);
    });
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur("");

    const res = await fetch("/api/helpdesk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setErreur(data.erreur || "Une erreur est survenue");
      setChargement(false);
      return;
    }

    router.push("/client/helpdesk");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="CLIENT" prenom={prenom} permissions={permissions} />
      <div className="flex">
        <Sidebar role="CLIENT" />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <h1 className="text-3xl font-bold">➕ Nouveau ticket support</h1>
            <button
              onClick={() => router.push("/client/helpdesk")}
              className="bg-white border px-5 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              ← Retour
            </button>
          </div>

          <div className="bg-white rounded-xl shadow p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-1">Titre *</label>
                  <input
                    type="text"
                    name="titre"
                    value={form.titre}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-4 py-3"
                    placeholder="Ex: Impossible de saisir une absence"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Catégorie *</label>
                  <select
                    name="categorie"
                    value={form.categorie}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-4 py-3"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Description *</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-4 py-3 h-40 resize-none"
                  placeholder="Décrivez votre problème en détail..."
                  required
                />
              </div>

              {erreur && <p className="text-red-500">{erreur}</p>}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={chargement}
                  className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition"
                >
                  {chargement ? "Envoi..." : "✅ Envoyer"}
                </button>
              </div>

            </form>
          </div>

        </main>
      </div>
    </div>
  );
}