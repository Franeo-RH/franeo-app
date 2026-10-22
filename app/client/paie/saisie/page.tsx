"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const TYPES = [
  { value: "HEURE_SUPPLEMENTAIRE", label: "⏰ Heures supplémentaires", unite: "heures" },
  { value: "PRIME", label: "💰 Prime", unite: "€" },
  { value: "NOTE_FRAIS", label: "🧾 Note de frais", unite: "€" },
  { value: "ACOMPTE", label: "💳 Acompte", unite: "€" },
];

type Salarie = { id: string; nom: string; prenom: string };

export default function SaisiePaie() {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [prenom, setPrenom] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);

  const maintenant = new Date();

  const [form, setForm] = useState({
    salarieId: "",
    type: "HEURE_SUPPLEMENTAIRE",
    valeur: "",
    commentaire: "",
    mois: maintenant.getMonth() + 1,
    annee: maintenant.getFullYear(),
  });

  useEffect(() => {
    fetch("/api/salaries").then(r => r.json()).then(setSalaries);
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
    setSucces("");

    const res = await fetch("/api/paie", {
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

    setSucces("Variable ajoutée avec succès !");
    setForm({
      salarieId: "",
      type: "HEURE_SUPPLEMENTAIRE",
      valeur: "",
      commentaire: "",
      mois: maintenant.getMonth() + 1,
      annee: maintenant.getFullYear(),
    });
    setChargement(false);
  }

  const typeSelectionne = TYPES.find(t => t.value === form.type);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="CLIENT" prenom={prenom} permissions={permissions} />
      <div className="flex">
        <Sidebar role="CLIENT" />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <h1 className="text-3xl font-bold">✏️ Saisir des variables de paie</h1>
            <button
              onClick={() => router.push("/client/paie")}
              className="bg-white border px-5 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              ← Retour
            </button>
          </div>

          <div className="bg-white rounded-xl shadow p-8">
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">

              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-1">Salarié *</label>
                <select name="salarieId" value={form.salarieId} onChange={handleChange} className="w-full border rounded-lg px-4 py-3" required>
                  <option value="">Sélectionner un salarié...</option>
                  {salaries.map((s) => (
                    <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Mois *</label>
                <select name="mois" value={form.mois} onChange={handleChange} className="w-full border rounded-lg px-4 py-3">
                  {MOIS.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Année *</label>
                <select name="annee" value={form.annee} onChange={handleChange} className="w-full border rounded-lg px-4 py-3">
                  {[2024, 2025, 2026, 2027].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Type *</label>
                <select name="type" value={form.type} onChange={handleChange} className="w-full border rounded-lg px-4 py-3">
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Valeur * ({typeSelectionne?.unite})
                </label>
                <input
                  type="number"
                  name="valeur"
                  value={form.valeur}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-4 py-3"
                  placeholder={`Ex: ${form.type === "HEURE_SUPPLEMENTAIRE" ? "2" : "500"}`}
                  required
                  min="0"
                  step="0.5"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-1">Commentaire</label>
                <textarea name="commentaire" value={form.commentaire} onChange={handleChange} className="w-full border rounded-lg px-4 py-3 h-24 resize-none" placeholder="Précisions sur cette variable..." />
              </div>

              {erreur && <p className="col-span-2 text-red-500">{erreur}</p>}
              {succes && <p className="col-span-2 text-green-500">{succes}</p>}

              <div className="col-span-2 flex justify-end">
                <button type="submit" disabled={chargement} className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition">
                  {chargement ? "Enregistrement..." : "✅ Ajouter la variable"}
                </button>
              </div>

            </form>
          </div>

        </main>
      </div>
    </div>
  );
}