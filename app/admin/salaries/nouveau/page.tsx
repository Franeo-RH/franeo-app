"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

const ONGLETS = ["Infos personnelles", "Poste", "Salaire", "Documents"];

type Entreprise = { id: string; nom: string };

export default function NouveauSalarieAdmin() {
  const router = useRouter();
  const [onglet, setOnglet] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);

  const [form, setForm] = useState({
    entrepriseId: "",
    nom: "", prenom: "", email: "", telephone: "",
    dateNaissance: "", lieuNaissance: "", nationalite: "",
    numeroSecuriteSociale: "", rue: "", codePostal: "", ville: "", pays: "",
    poste: "", typeContrat: "", dateDebut: "", dateFin: "",
    heuresHebdomadaires: "", manager: "", etablissement: "", service: "", soldeConges: "", conventionCollective: "",
    categorie: "", coefficient: "",
    salaireMensuel: "", salaireAnnuel: "", primes: "", avantages: "",
  });

  useEffect(() => {
    fetch("/api/entreprises")
      .then((res) => res.json())
      .then(setEntreprises);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit() {
    setChargement(true);
    setErreur("");

    if (!form.entrepriseId) {
      setErreur("Veuillez sélectionner une entreprise");
      setChargement(false);
      return;
    }

    const res = await fetch("/api/salaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setErreur(data.erreur || "Une erreur est survenue");
      setChargement(false);
      return;
    }

    router.push("/admin/salaries");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom="" />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h1 className="text-3xl font-bold">➕ Ajouter un salarié</h1>
          </div>

          {/* Sélecteur entreprise */}
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <label className="block text-sm font-semibold mb-2">
              Entreprise *
            </label>
            <select
              name="entrepriseId"
              value={form.entrepriseId}
              onChange={handleChange}
              className="w-full border rounded-lg px-4 py-3"
            >
              <option value="">Sélectionner une entreprise...</option>
              {entreprises.map((e) => (
                <option key={e.id} value={e.id}>{e.nom}</option>
              ))}
            </select>
          </div>

          {/* Onglets */}
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
                <Field label="Date de fin" name="dateFin" value={form.dateFin} onChange={handleChange} type="date" />
                <Field label="Heures hebdomadaires" name="heuresHebdomadaires" value={form.heuresHebdomadaires} onChange={handleChange} type="number" />
                <Field label="Manager" name="manager" value={form.manager} onChange={handleChange} />
                <Field label="Établissement" name="etablissement" value={form.etablissement} onChange={handleChange} />
                <Field label="Service" name="service" value={form.service} onChange={handleChange} />
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
            {onglet === 3 && (
              <p className="text-gray-500">L'upload de documents sera disponible prochainement.</p>
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