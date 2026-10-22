"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const TYPES_ABSENCE = [
  { value: "CONGE_PAYE", label: "🏖️ Congés payés" },
  { value: "RTT", label: "📅 RTT" },
  { value: "CONGE_SANS_SOLDE", label: "💼 Congé sans solde" },
  { value: "CONGE_EXCEPTIONNEL", label: "⭐ Congé exceptionnel" },
  { value: "CONGE_NAISSANCE", label: "👶 Congé naissance" },
  { value: "MATERNITE_PATERNITE", label: "👨‍👩‍👦 Maternité / Paternité" },
  { value: "MALADIE", label: "🤒 Maladie" },
  { value: "ABSENCE_NON_REMUNEREE", label: "❌ Absence non rémunérée" },
];

type Entreprise = { id: string; nom: string };
type Salarie = { id: string; nom: string; prenom: string; entrepriseId: string };

export default function FormulaireAbsenceAdmin() {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [afficher, setAfficher] = useState(false);

  const [form, setForm] = useState({
    entrepriseId: "",
    salarieId: "",
    type: "CONGE_PAYE",
    dateDebut: "",
    dateFin: "",
    commentaire: "",
  });

  useEffect(() => {
    fetch("/api/entreprises").then(r => r.json()).then(setEntreprises);
    fetch("/api/salaries").then(r => r.json()).then(setSalaries);
  }, []);

  const salariesFiltres = salaries.filter(s =>
    !form.entrepriseId || s.entrepriseId === form.entrepriseId
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === "entrepriseId" ? { salarieId: "" } : {}),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur("");
    setSucces("");

    const res = await fetch("/api/absences", {
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

    setSucces("Absence ajoutée avec succès !");
    setForm({ entrepriseId: "", salarieId: "", type: "CONGE_PAYE", dateDebut: "", dateFin: "", commentaire: "" });
    router.refresh();
    setChargement(false);
  }

  return (
    <div className="bg-white rounded-xl shadow p-8 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">➕ Ajouter une absence</h2>
        <button
          onClick={() => setAfficher(!afficher)}
          className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-orange-600 transition"
        >
          {afficher ? "← Masquer" : "➕ Ajouter"}
        </button>
      </div>

      {afficher && (
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">

          <div>
            <label className="block text-sm font-semibold mb-1">Entreprise *</label>
            <select name="entrepriseId" value={form.entrepriseId} onChange={handleChange} className="w-full border rounded-lg px-4 py-3" required>
              <option value="">Sélectionner une entreprise...</option>
              {entreprises.map((e) => (
                <option key={e.id} value={e.id}>{e.nom}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Salarié *</label>
            <select name="salarieId" value={form.salarieId} onChange={handleChange} className="w-full border rounded-lg px-4 py-3" required>
              <option value="">Sélectionner un salarié...</option>
              {salariesFiltres.map((s) => (
                <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Type *</label>
            <select name="type" value={form.type} onChange={handleChange} className="w-full border rounded-lg px-4 py-3">
              {TYPES_ABSENCE.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Date de début *</label>
            <input type="date" name="dateDebut" value={form.dateDebut} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-lg px-4 py-4 text-lg focus:border-orange-500 focus:outline-none" required />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Date de fin *</label>
            <input type="date" name="dateFin" value={form.dateFin} min={form.dateDebut} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-lg px-4 py-4 text-lg focus:border-orange-500 focus:outline-none" required />
          </div>

          {form.dateDebut && form.dateFin && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center">
              <p className="text-orange-600 font-semibold text-sm">
                📊 Durée : {Math.ceil((new Date(form.dateFin).getTime() - new Date(form.dateDebut).getTime()) / (1000 * 60 * 60 * 24)) + 1} jour(s)
              </p>
            </div>
          )}

          <div className="col-span-2">
            <label className="block text-sm font-semibold mb-1">Commentaire</label>
            <textarea name="commentaire" value={form.commentaire} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 h-24 resize-none focus:border-orange-500 focus:outline-none" placeholder="Précisions..." />
          </div>

          {erreur && <p className="col-span-2 text-red-500">{erreur}</p>}
          {succes && <p className="col-span-2 text-green-500">{succes}</p>}

          <div className="col-span-2 flex justify-end">
            <button type="submit" disabled={chargement} className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition">
              {chargement ? "Enregistrement..." : "✅ Enregistrer"}
            </button>
          </div>

        </form>
      )}
    </div>
  );
}