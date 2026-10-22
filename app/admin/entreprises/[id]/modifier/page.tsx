"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

const ONGLETS = ["Infos entreprise", "Coordonnées bancaires"];

type Abonnement = { id: string; nom: string; prixMensuel: number };

export default function ModifierEntreprise() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [onglet, setOnglet] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [chargementInitial, setChargementInitial] = useState(true);
  const [abonnements, setAbonnements] = useState<Abonnement[]>([]);

  const [form, setForm] = useState({
    nom: "",
    siret: "",
    email: "",
    telephone: "",
    siteWeb: "",
    rue: "",
    codePostal: "",
    ville: "",
    pays: "",
    abonnementId: "",
    banque: "",
    iban: "",
    bic: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/entreprises/${id}`).then(r => r.json()),
      fetch("/api/abonnements").then(r => r.json()),
    ]).then(([entreprise, abonnements]) => {
      setForm({
        nom: entreprise.nom || "",
        siret: entreprise.siret || "",
        email: entreprise.email || "",
        telephone: entreprise.telephone || "",
        siteWeb: entreprise.siteWeb || "",
        rue: entreprise.rue || "",
        codePostal: entreprise.codePostal || "",
        ville: entreprise.ville || "",
        pays: entreprise.pays || "",
        abonnementId: entreprise.abonnementId || "",
        banque: entreprise.banque || "",
        iban: entreprise.iban || "",
        bic: entreprise.bic || "",
      });
      setAbonnements(abonnements);
      setChargementInitial(false);
    });
  }, [id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit() {
    setChargement(true);
    setErreur("");

    const res = await fetch(`/api/entreprises/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setErreur(data.erreur || "Une erreur est survenue");
      setChargement(false);
      return;
    }

    router.push(`/admin/entreprises/${id}`);
  }

  if (chargementInitial) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom="" />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <h1 className="text-3xl font-bold">✏️ Modifier {form.nom}</h1>
            <button
              onClick={() => router.push(`/admin/entreprises/${id}`)}
              className="bg-white border px-5 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              ← Retour
            </button>
          </div>

          <div className="flex gap-2 mb-6">
            {ONGLETS.map((o, i) => (
              <button
                key={i}
                onClick={() => setOnglet(i)}
                className={`px-5 py-2 rounded-lg font-semibold transition ${onglet === i ? "bg-orange-500 text-white" : "bg-white text-black hover:bg-gray-100"}`}
              >
                {o}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow p-8">

            {onglet === 0 && (
              <div className="grid grid-cols-2 gap-6">
                <Field label="Nom *" name="nom" value={form.nom} onChange={handleChange} />
                <Field label="SIRET" name="siret" value={form.siret} onChange={handleChange} />
                <Field label="Email" name="email" value={form.email} onChange={handleChange} type="email" />
                <Field label="Téléphone" name="telephone" value={form.telephone} onChange={handleChange} />
                <Field label="Site web" name="siteWeb" value={form.siteWeb} onChange={handleChange} />
                <div>
                  <label className="block text-sm font-semibold mb-1">Abonnement</label>
                  <select name="abonnementId" value={form.abonnementId} onChange={handleChange} className="w-full border rounded-lg px-4 py-3">
                    <option value="">Sélectionner...</option>
                    {abonnements.map((a) => (
                      <option key={a.id} value={a.id}>{a.nom} — {a.prixMensuel}€/mois</option>
                    ))}
                  </select>
                </div>
                <Field label="Rue" name="rue" value={form.rue} onChange={handleChange} />
                <Field label="Code postal" name="codePostal" value={form.codePostal} onChange={handleChange} />
                <Field label="Ville" name="ville" value={form.ville} onChange={handleChange} />
                <Field label="Pays" name="pays" value={form.pays} onChange={handleChange} />
              </div>
            )}

            {onglet === 1 && (
              <div className="grid grid-cols-2 gap-6">
                <Field label="Banque" name="banque" value={form.banque} onChange={handleChange} />
                <Field label="IBAN" name="iban" value={form.iban} onChange={handleChange} />
                <Field label="BIC" name="bic" value={form.bic} onChange={handleChange} />
              </div>
            )}

          </div>

          {erreur && <p className="text-red-500 mt-4">{erreur}</p>}

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setOnglet(Math.max(0, onglet - 1))}
              disabled={onglet === 0}
              className="bg-white border px-6 py-3 rounded-lg font-semibold disabled:opacity-30"
            >
              ← Précédent
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={chargement}
                className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition"
              >
                {chargement ? "Enregistrement..." : "✅ Enregistrer"}
              </button>
              {onglet < ONGLETS.length - 1 && (
                <button
                  onClick={() => setOnglet(onglet + 1)}
                  className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
                >
                  Suivant →
                </button>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text" }: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1">{label}</label>
      <input type={type} name={name} value={value} onChange={onChange} className="w-full border rounded-lg px-4 py-3" />
    </div>
  );
}