"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { CATEGORIES_RECRUTEMENT, LANCEMENT_RECRUTEMENT } from "@/lib/recrutement";

const ONGLETS = ["Le poste", "Rémunération", "Missions & Profil", "Validation"];

export default function DemandeRecrutement() {
  const router = useRouter();
  const [onglet, setOnglet] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [cgv, setCgv] = useState(false);
  const [primes, setPrimes] = useState(false);

  const [form, setForm] = useState({
    poste: "",
    typeContrat: "",
    dateDebut: "",
    salaireMini: "",
    salaireMaxi: "",
    primes: "",
    missions: "",
    profil: "",
    experience: "",
    formation: "",
    commentaire: "",
    categorie: "NON_QUALIFIE",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit() {
    if (!cgv) { setErreur("Vous devez accepter les conditions financières."); return; }
    if (!form.poste || !form.typeContrat || !form.missions || !form.profil) {
      setErreur("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setChargement(true);
    setErreur("");

    const res = await fetch("/api/recrutement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, cgvAcceptees: cgv }),
    });

    const data = await res.json();

    if (!res.ok) {
      setErreur(data.erreur || "Une erreur est survenue");
      setChargement(false);
      return;
    }

    router.push("/client/tickets?recrutement=ok");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="CLIENT" prenom="" />
      <div className="flex">
        <Sidebar role="CLIENT" />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">🎯 Demande de recrutement</h1>
              <p className="text-gray-500 mt-1">Remplissez les informations sur le poste à pourvoir</p>
            </div>
            <button onClick={() => router.back()} className="bg-white border px-5 py-2 rounded-lg font-semibold hover:bg-gray-100 transition">
              ← Retour
            </button>
          </div>

          {/* Onglets */}
          <div className="flex gap-2 mb-6">
            {ONGLETS.map((o, i) => (
              <button
                key={i}
                onClick={() => setOnglet(i)}
                className={`px-5 py-2 rounded-lg font-semibold transition ${onglet === i ? "bg-orange-500 text-white" : "bg-white text-gray-500 hover:bg-gray-100"}`}
              >
                {i + 1}. {o}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow p-8">

            {/* Onglet 1 - Le poste */}
            {onglet === 0 && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-1">Intitulé du poste *</label>
                  <input type="text" name="poste" value={form.poste} onChange={handleChange} className="w-full border rounded-lg px-4 py-3" placeholder="Ex: Développeur React Senior" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="block text-sm font-semibold mb-1">Catégorie du poste *</label>
                  <select name="categorie" value={form.categorie} onChange={handleChange} className="w-full border rounded-lg px-4 py-3">
                    {CATEGORIES_RECRUTEMENT.map((c) => (
                      <option key={c.code} value={c.code}>{c.label} — {LANCEMENT_RECRUTEMENT + c.signature + c.finEssai} € au total</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Type de contrat *</label>
                  <select name="typeContrat" value={form.typeContrat} onChange={handleChange} className="w-full border rounded-lg px-4 py-3">
                    <option value="">Sélectionner...</option>
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="Alternance">Alternance</option>
                    <option value="Stage">Stage</option>
                    <option value="Intérim">Intérim</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Date de début souhaitée</label>
                  <input type="date" name="dateDebut" value={form.dateDebut} onChange={handleChange} className="w-full border rounded-lg px-4 py-3" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Commentaire libre</label>
                  <input type="text" name="commentaire" value={form.commentaire} onChange={handleChange} className="w-full border rounded-lg px-4 py-3" placeholder="Ex: Remplacement congé maternité..." />
                </div>
              </div>
            )}

            {/* Onglet 2 - Rémunération */}
            {onglet === 1 && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-1">Salaire minimum (€/mois)</label>
                  <input type="number" name="salaireMini" value={form.salaireMini} onChange={handleChange} className="w-full border rounded-lg px-4 py-3" placeholder="Ex: 2500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Salaire maximum (€/mois)</label>
                  <input type="number" name="salaireMaxi" value={form.salaireMaxi} onChange={handleChange} className="w-full border rounded-lg px-4 py-3" placeholder="Ex: 3500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-1">Primes & avantages</label>
                  <textarea name="primes" value={form.primes} onChange={handleChange} className="w-full border rounded-lg px-4 py-3" rows={4} placeholder="Ex: Prime annuelle, tickets restaurant, mutuelle, télétravail..." />
                </div>
              </div>
            )}

            {/* Onglet 3 - Missions & Profil */}
            {onglet === 2 && (
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-1">Missions principales *</label>
                  <textarea name="missions" value={form.missions} onChange={handleChange} className="w-full border rounded-lg px-4 py-3" rows={5} placeholder="Décrivez les missions du poste..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Profil recherché *</label>
                  <textarea name="profil" value={form.profil} onChange={handleChange} className="w-full border rounded-lg px-4 py-3" rows={5} placeholder="Compétences requises, qualités, etc..." />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Expérience requise</label>
                    <input type="text" name="experience" value={form.experience} onChange={handleChange} className="w-full border rounded-lg px-4 py-3" placeholder="Ex: 3 ans minimum" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Formation souhaitée</label>
                    <input type="text" name="formation" value={form.formation} onChange={handleChange} className="w-full border rounded-lg px-4 py-3" placeholder="Ex: Bac+5 en informatique" />
                  </div>
                </div>
              </div>
            )}

            {/* Onglet 4 - Validation */}
            {onglet === 3 && (
              <div className="flex flex-col gap-6">
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                  <h2 className="text-lg font-bold text-orange-600 mb-3">📋 Récapitulatif</h2>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">Poste :</span> <span className="font-semibold">{form.poste || "—"}</span></div>
                    <div><span className="text-gray-500">Contrat :</span> <span className="font-semibold">{form.typeContrat || "—"}</span></div>
                    <div><span className="text-gray-500">Salaire :</span> <span className="font-semibold">{form.salaireMini && form.salaireMaxi ? `${form.salaireMini} - ${form.salaireMaxi} €/mois` : "—"}</span></div>
                    <div><span className="text-gray-500">Début :</span> <span className="font-semibold">{form.dateDebut ? new Date(form.dateDebut).toLocaleDateString("fr-FR") : "—"}</span></div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                  <h2 className="text-lg font-bold text-red-600 mb-3">💶 Conditions financières</h2>
                  <p className="text-sm text-gray-600 mb-3">
                    En validant cette demande, vous acceptez les frais suivants pour un poste « {(CATEGORIES_RECRUTEMENT.find((c) => c.code === form.categorie) ?? CATEGORIES_RECRUTEMENT[0]).label} » :
                  </p>
                  <ul className="text-sm text-gray-700 mb-4" style={{ listStyle: "disc", paddingLeft: "20px" }}>
                    <li><strong>{LANCEMENT_RECRUTEMENT} €</strong> de lancement, sur la facture de ce mois (cadrage, annonce, recherche) ;</li>
                    <li><strong>{(CATEGORIES_RECRUTEMENT.find((c) => c.code === form.categorie) ?? CATEGORIES_RECRUTEMENT[0]).signature} €</strong> à la signature du contrat avec le candidat retenu ;</li>
                    <li><strong>{(CATEGORIES_RECRUTEMENT.find((c) => c.code === form.categorie) ?? CATEGORIES_RECRUTEMENT[0]).finEssai} €</strong> si la période d&apos;essai est validée.</li>
                  </ul>
                  <p className="text-sm text-gray-600 mb-4">Les primes ne sont dues que si le recrutement aboutit. Conditions complètes sur <strong>franeo-rh.com</strong>.</p>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cgv}
                      onChange={e => setCgv(e.target.checked)}
                      className="mt-1 w-5 h-5 accent-orange-500"
                    />
                    <span className="text-sm font-semibold">
                      J'accepte les frais de lancement et les primes de succès ci-dessus (CGV FRANEO RH).
                    </span>
                  </label>
                </div>

                {erreur && <p className="text-red-500 font-semibold">{erreur}</p>}
              </div>
            )}

          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setOnglet(Math.max(0, onglet - 1))}
              disabled={onglet === 0}
              className="bg-white border px-6 py-3 rounded-lg font-semibold disabled:opacity-30"
            >
              ← Précédent
            </button>
            {onglet < ONGLETS.length - 1 ? (
              <button onClick={() => setOnglet(onglet + 1)} className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition">
                Suivant →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={chargement || !cgv}
                className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-40"
              >
                {chargement ? "Envoi en cours..." : "✅ Envoyer la demande"}
              </button>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}