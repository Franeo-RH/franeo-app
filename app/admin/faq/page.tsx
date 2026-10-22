"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

const MODULES = [
  "Salariés",
  "Paie",
  "Absences",
  "Tickets RH",
  "Helpdesk",
  "Entreprise",
  "Général",
];

type FAQ = {
  id: string;
  module: string;
  question: string;
  reponse: string;
  ordre: number;
};

export default function AdminFAQ() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [moduleActif, setModuleActif] = useState("Général");
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [faqEnEdition, setFaqEnEdition] = useState<FAQ | null>(null);
  const [chargement, setChargement] = useState(false);
  const [succes, setSucces] = useState("");

  const [form, setForm] = useState({
    module: "Général",
    question: "",
    reponse: "",
    ordre: 0,
  });

  useEffect(() => {
    fetch("/api/faq").then(r => r.json()).then(setFaqs);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleEditer(faq: FAQ) {
    setFaqEnEdition(faq);
    setForm({ module: faq.module, question: faq.question, reponse: faq.reponse, ordre: faq.ordre });
    setAfficherFormulaire(true);
  }

  function handleAnnuler() {
    setAfficherFormulaire(false);
    setFaqEnEdition(null);
    setForm({ module: moduleActif, question: "", reponse: "", ordre: 0 });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);

    const url = faqEnEdition ? `/api/faq/${faqEnEdition.id}` : "/api/faq";
    const method = faqEnEdition ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const data = await fetch("/api/faq").then(r => r.json());
      setFaqs(data);
      setSucces(faqEnEdition ? "Question modifiée !" : "Question ajoutée !");
      handleAnnuler();
      setTimeout(() => setSucces(""), 3000);
    }

    setChargement(false);
  }

  async function handleSupprimer(id: string) {
    if (!confirm("Supprimer cette question ?")) return;

    const res = await fetch(`/api/faq/${id}`, { method: "DELETE" });

    if (res.ok) {
      setFaqs(faqs.filter(f => f.id !== id));
    }
  }

  const faqsFiltrees = faqs.filter(f => f.module === moduleActif);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom="" />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">❓ FAQ</h1>
              <p className="text-gray-500 mt-1">Gérez les questions fréquentes</p>
            </div>
            <button
              onClick={() => { setAfficherFormulaire(!afficherFormulaire); setFaqEnEdition(null); setForm({ module: moduleActif, question: "", reponse: "", ordre: 0 }); }}
              className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-orange-600 transition"
            >
              {afficherFormulaire ? "← Annuler" : "➕ Ajouter une question"}
            </button>
          </div>

          {succes && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <p className="text-green-600 font-semibold">{succes}</p>
            </div>
          )}

          {afficherFormulaire && (
            <div className="bg-white rounded-xl shadow p-8 mb-6">
              <h2 className="text-xl font-bold mb-6">{faqEnEdition ? "✏️ Modifier la question" : "➕ Nouvelle question"}</h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Module *</label>
                    <select name="module" value={form.module} onChange={handleChange} className="w-full border rounded-lg px-4 py-3">
                      {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Ordre d'affichage</label>
                    <input type="number" name="ordre" value={form.ordre} onChange={handleChange} className="w-full border rounded-lg px-4 py-3" min="0" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Question *</label>
                  <input type="text" name="question" value={form.question} onChange={handleChange} className="w-full border rounded-lg px-4 py-3" placeholder="Ex: Comment ajouter un salarié ?" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Réponse *</label>
                  <textarea name="reponse" value={form.reponse} onChange={handleChange} className="w-full border rounded-lg px-4 py-3 h-32 resize-none" placeholder="Réponse détaillée..." required />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={handleAnnuler} className="bg-white border px-5 py-2 rounded-lg font-semibold hover:bg-gray-100 transition">
                    Annuler
                  </button>
                  <button type="submit" disabled={chargement} className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition">
                    {chargement ? "..." : faqEnEdition ? "✅ Modifier" : "✅ Ajouter"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Onglets modules */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {MODULES.map(m => (
              <button
                key={m}
                onClick={() => setModuleActif(m)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${moduleActif === m ? "bg-orange-500 text-white" : "bg-white text-black hover:bg-gray-100"}`}
              >
                {m} <span className="text-xs ml-1 opacity-70">({faqs.filter(f => f.module === m).length})</span>
              </button>
            ))}
          </div>

          {/* Liste FAQ */}
          <div className="flex flex-col gap-4">
            {faqsFiltrees.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
                Aucune question pour ce module. Ajoutez-en une !
              </div>
            ) : (
              faqsFiltrees.map(faq => (
                <div key={faq.id} className="bg-white rounded-xl shadow p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-bold text-lg mb-2">❓ {faq.question}</p>
                      <p className="text-gray-600">{faq.reponse}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button onClick={() => handleEditer(faq)} className="bg-orange-100 text-orange-600 px-3 py-1 rounded-lg text-sm font-semibold hover:bg-orange-200 transition">
                        ✏️
                      </button>
                      <button onClick={() => handleSupprimer(faq.id)} className="bg-red-100 text-red-600 px-3 py-1 rounded-lg text-sm font-semibold hover:bg-red-200 transition">
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </main>
      </div>
    </div>
  );
}