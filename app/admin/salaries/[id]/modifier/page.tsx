"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

const ONGLETS = ["Infos personnelles", "Poste", "Salaire"];

export default function ModifierSalarieAdmin({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [onglet, setOnglet] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [id, setId] = useState("");

  const [form, setForm] = useState({
    nom: "", prenom: "", email: "", telephone: "",
    dateNaissance: "", lieuNaissance: "", nationalite: "",
    numeroSecuriteSociale: "", rue: "", codePostal: "", ville: "", pays: "",
    poste: "", typeContrat: "", dateDebut: "", dateFin: "",
    heuresHebdomadaires: "", manager: "", conventionCollective: "",
    categorie: "", coefficient: "", statut: "Actif",
    salaireMensuel: "", salaireAnnuel: "", primes: "", avantages: "",
  });

  useEffect(() => {
    params.then(p => {
      setId(p.id);
      fetch(`/api/salaries/${p.id}`)
        .then(r => r.json())
        .then(data => {
          setForm({
            nom: data.nom || "",
            prenom: data.prenom || "",
            email: data.email || "",
            telephone: data.telephone || "",
            dateNaissance: data.dateNaissance ? data.dateNaissance.split("T")[0] : "",
            lieuNaissance: data.lieuNaissance || "",
            nationalite: data.nationalite || "",
            numeroSecuriteSociale: data.numeroSecuriteSociale || "",
            rue: data.rue || "",
            codePostal: data.codePostal || "",
            ville: data.ville || "",
            pays: data.pays || "",
            poste: data.poste || "",
            typeContrat: data.typeContrat || "",
            dateDebut: data.dateDebut ? data.dateDebut.split("T")[0] : "",
            dateFin: data.dateFin ? data.dateFin.split("T")[0] : "",
            heuresHebdomadaires: data.heuresHebdomadaires?.toString() || "",
            manager: data.manager || "",
            conventionCollective: data.conventionCollective || "",
            categorie: data.categorie || "",
            coefficient: data.coefficient || "",
            statut: data.statut || "Actif",
            salaireMensuel: data.salaireMensuel?.toString() || "",
            salaireAnnuel: data.salaireAnnuel?.toString() || "",
            primes: data.primes?.toString() || "",
            avantages: data.avantages || "",
          });
        });
    });
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit() {
    setChargement(true);
    setErreur("");

    const res = await fetch(`/api/salaries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        dateFin: form.dateFin || null,
        dateDebut: form.dateDebut || null,
        dateNaissance: form.dateNaissance || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setErreur(data.erreur || "Une erreur est survenue");
      setChargement(false);
      return;
    }

    router.push(`/admin/salaries/${id}`);
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom="" />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <h1 className="text-3xl font-bold">✏️ Modifier le salarié</h1>
            <button onClick={() => router.back()} className="bg-white border px-5 py-2 rounded-lg font-semibold hover:bg-gray-100 transition">
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
                <Field label="Prénom *" name="prenom" value={form.prenom} onChange={handleChange} />
                <Field label="Email" name="email" value={form.email} onChange={handleChange} type="email" />
                <Field label="Téléphone" name="telephone" value={form.telephone} onChange={handleChange} />
                <Field label="Date de naissance" name="dateNaissance" value={form.dateNaissance} onChange={handleChange} type="date" />
                <Field label="Lieu de naissance" name="lieuNaissance" value={form.lieuNaissance} onChange={handleChange} />
                <Field label="Nationalité" name="nationalite" value={form.nationalite} onChange={handleChange} />
                <Field label="N° sécurité sociale" name="numeroSecuriteSociale" value={form.numeroSecuriteSociale} onChange={handleChange} />
                <Field label="Rue" name="rue" value={form.rue} onChange={handleChange} />
                <Field label="Code postal" name="codePostal" value={form.codePostal} onChange={handleChange} />
                <Field label="Ville" name="ville" value={form.ville} onChange={handleChange} />
                <Field label="Pays" name="pays" value={form.pays} onChange={handleChange} />
                <div>
                  <label className="block text-sm font-semibold mb-1">Statut</label>
                  <select name="statut" value={form.statut} onChange={handleChange} className="w-full border rounded-lg px-4 py-3">
                    <option value="Actif">Actif</option>
                    <option value="Inactif">Inactif</option>
                  </select>
                </div>
              </div>
            )}

            {onglet === 1 && (
              <div className="grid grid-cols-2 gap-6">
                <Field label="Poste *" name="poste" value={form.poste} onChange={handleChange} />
                <div>
                  <label className="block text-sm font-semibold mb-1">Type de contrat</label>
                  <select name="typeContrat" value={form.typeContrat} onChange={handleChange} className="w-full border rounded-lg px-4 py-3">
                    <option value="">Sélectionner...</option>
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="Alternance">Alternance</option>
                    <option value="Stage">Stage</option>
                    <option value="Intérim">Intérim</option>
                  </select>
                </div>
                <Field label="Date de début" name="dateDebut" value={form.dateDebut} onChange={handleChange} type="date" />

                {/* Date de fin avec bouton effacer */}
                <div>
                  <label className="block text-sm font-semibold mb-1">Date de fin (sortie)</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="date"
                      name="dateFin"
                      value={form.dateFin}
                      onChange={handleChange}
                      className="flex-1 border rounded-lg px-4 py-3"
                    />
                    {form.dateFin && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, dateFin: "" })}
                        className="bg-gray-100 text-gray-500 px-3 py-3 rounded-lg hover:bg-red-50 hover:text-red-500 transition text-sm font-semibold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {!form.dateFin && (
                    <p className="text-xs text-gray-400 mt-1">Aucune date de fin — contrat en cours</p>
                  )}
                </div>

                <Field label="Heures hebdomadaires" name="heuresHebdomadaires" value={form.heuresHebdomadaires} onChange={handleChange} type="number" />
                <Field label="Manager" name="manager" value={form.manager} onChange={handleChange} />
                <Field label="Convention collective" name="conventionCollective" value={form.conventionCollective} onChange={handleChange} />
                <Field label="Catégorie" name="categorie" value={form.categorie} onChange={handleChange} />
                <Field label="Coefficient" name="coefficient" value={form.coefficient} onChange={handleChange} />
              </div>
            )}

            {onglet === 2 && (
              <div className="grid grid-cols-2 gap-6">
                <Field label="Salaire mensuel (€)" name="salaireMensuel" value={form.salaireMensuel} onChange={handleChange} type="number" />
                <Field label="Salaire annuel (€)" name="salaireAnnuel" value={form.salaireAnnuel} onChange={handleChange} type="number" />
                <Field label="Primes (€)" name="primes" value={form.primes} onChange={handleChange} type="number" />
                <Field label="Avantages" name="avantages" value={form.avantages} onChange={handleChange} />
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
            {onglet < ONGLETS.length - 1 ? (
              <button onClick={() => setOnglet(onglet + 1)} className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold">
                Suivant →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={chargement} className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold">
                {chargement ? "Enregistrement..." : "✅ Enregistrer"}
              </button>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text" }: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full border rounded-lg px-4 py-3"
      />
    </div>
  );
}