"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

const MODULES = [
  "Général",
  "Salariés",
  "Paie",
  "Absences",
  "Espace salarié",
  "Tickets RH",
  "Facturation",
  "Helpdesk",
  "Entreprise",
];

type FAQ = {
  id: string;
  module: string;
  question: string;
  reponse: string;
  ordre: number;
  entrepriseId?: string | null;
  entreprise?: { nom: string } | null;
};

export default function ClientFAQ() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [moduleActif, setModuleActif] = useState("Général");
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [prenom, setPrenom] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/faq").then(r => r.json()).then(d => Array.isArray(d) && setFaqs(d));
    fetch("/api/me").then(r => r.json()).then(data => {
      if (data.prenom) setPrenom(data.prenom);
      if (data.permissions) setPermissions(data.permissions);
    });
  }, []);

  const faqsFiltrees = faqs.filter(f => f.module === moduleActif);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="CLIENT" prenom={prenom} permissions={permissions} />
      <div className="flex">
        <Sidebar role="CLIENT" />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h1 className="text-3xl font-bold">❓ FAQ</h1>
            <p className="text-gray-500 mt-1">Questions fréquentes sur l'utilisation de Franeo</p>
          </div>

          {/* Onglets modules */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {MODULES.map(m => {
              const count = faqs.filter(f => f.module === m).length;
              if (count === 0) return null;
              return (
                <button
                  key={m}
                  onClick={() => { setModuleActif(m); setOuvert(null); }}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${moduleActif === m ? "bg-orange-500 text-white" : "bg-white text-black hover:bg-gray-100"}`}
                >
                  {m}
                </button>
              );
            })}
          </div>

          {/* Accordéon */}
          <div className="flex flex-col gap-3">
            {faqsFiltrees.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
                Aucune question disponible pour ce module.
              </div>
            ) : (
              faqsFiltrees.map(faq => (
                <div key={faq.id} className="bg-white rounded-xl shadow overflow-hidden">
                  <button
                    onClick={() => setOuvert(ouvert === faq.id ? null : faq.id)}
                    className="w-full flex justify-between items-center p-6 text-left hover:bg-gray-50 transition"
                  >
                    <span className="font-semibold text-lg">{faq.entrepriseId ? "⭐ " : ""}{faq.question}</span>
                    <span className="text-orange-500 text-xl ml-4">
                      {ouvert === faq.id ? "−" : "+"}
                    </span>
                  </button>
                  {ouvert === faq.id && (
                    <div className="px-6 pb-6 border-t pt-4">
                      <p className="text-gray-600 leading-relaxed" style={{ whiteSpace: "pre-line" }}>{faq.reponse}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

        </main>
      </div>
    </div>
  );
}