"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import RappelsSalarie from "@/components/RappelsSalarie";

const ONGLETS = ["Infos personnelles", "Poste", "Salaire", "Documents & échéances"];

export default function ModifierSalarie() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [onglet, setOnglet] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [chargementInitial, setChargementInitial] = useState(true);
  const [demo, setDemo] = useState(false);

  const [form, setForm] = useState({
    matricule: "",
    nom: "", prenom: "", email: "", telephone: "",
    dateNaissance: "", lieuNaissance: "", nationalite: "",
    numeroSecuriteSociale: "", rue: "", codePostal: "", ville: "", pays: "",
    poste: "", typeContrat: "", dateDebut: "", dateFin: "",
    heuresHebdomadaires: "", manager: "", conventionCollective: "",
    categorie: "", coefficient: "",
    salaireMensuel: "", salaireAnnuel: "", primes: "", avantages: "",
  });

  useEffect(() => {
    fetch("/api/demo/statut").then((r) => r.json()).then((d) => setDemo(!!d.demo)).catch(() => {});
    fetch(`/api/salaries/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setForm({
          matricule: data.matricule || "",
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
          salaireMensuel: data.salaireMensuel?.toString() || "",
          salaireAnnuel: data.salaireAnnuel?.toString() || "",
          primes: data.primes?.toString() || "",
          avantages: data.avantages || "",
        });
        setChargementInitial(false);
      });
  }, [id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit() {
    setChargement(true);
    setErreur("");

    const res = await fetch(`/api/salaries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      const message = data.erreur || "Une erreur est survenue";
      setErreur(message);
      if (message.toLowerCase().includes("matricule")) setOnglet(0);
      setChargement(false);
      return;
    }

    router.push(`/client/salaries/${id}`);
  }

  // Champ de saisie, ou bloc gris verrouillé dans la version démo
  function champ(label: string, name: keyof typeof form, type = "text", libre = false) {
    if (demo && !libre) return <Verrou key={name} label={label} />;
    return <Field key={name} label={label} name={name} value={form[name]} onChange={handleChange} type={type} />;
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
      <Navbar role="CLIENT" prenom="" />
      <div className="flex">
        <Sidebar role="CLIENT" />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">✏️ Modifier {form.prenom} {demo ? "" : form.nom}</h1>
              {demo && <p className="text-sm text-blue-600 mt-2">🧪 Version démo : seuls le prénom, le poste, les dates de début et de fin et le salaire sont modifiables.</p>}
            </div>
            <button
              onClick={() => router.push(`/client/salaries/${id}`)}
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

          {onglet < 3 ? (
            <div className="bg-white rounded-xl shadow p-8">
              {onglet === 0 && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    {champ("Matricule", "matricule")}
                    {!demo && <p className="text-xs text-gray-400 mt-1">Facultatif. Doit être unique dans l&apos;entreprise.</p>}
                  </div>
                  {champ("Nom *", "nom")}
                  {champ("Prénom *", "prenom", "text", true)}
                  {champ("Email", "email", "email")}
                  {champ("Téléphone", "telephone")}
                  {champ("Date de naissance", "dateNaissance", "date")}
                  {champ("Lieu de naissance", "lieuNaissance")}
                  {champ("Nationalité", "nationalite")}
                  {champ("N° sécurité sociale", "numeroSecuriteSociale")}
                  {champ("Rue", "rue")}
                  {champ("Code postal", "codePostal")}
                  {champ("Ville", "ville")}
                  {champ("Pays", "pays")}
                </div>
              )}
              {onglet === 1 && (
                <div className="grid grid-cols-2 gap-6">
                  {champ("Poste *", "poste", "text", true)}
                  {demo ? (
                    <Verrou label="Type de contrat" />
                  ) : (
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
                  )}
                  {champ("Date de début", "dateDebut", "date", true)}
                  {champ("Date de fin", "dateFin", "date", true)}
                  {champ("Heures hebdomadaires", "heuresHebdomadaires", "number")}
                  {champ("Manager", "manager")}
                  {champ("Convention collective", "conventionCollective")}
                  {champ("Catégorie", "categorie")}
                  {champ("Coefficient", "coefficient")}
                </div>
              )}
              {onglet === 2 && (
                <div className="grid grid-cols-2 gap-6">
                  {champ("Salaire mensuel (€)", "salaireMensuel", "number", true)}
                  {champ("Salaire annuel (€)", "salaireAnnuel", "number", true)}
                  {champ("Primes (€)", "primes", "number")}
                  {champ("Avantages", "avantages")}
                </div>
              )}
            </div>
          ) : (
            <RappelsSalarie
              salarieId={id}
              finContrat={form.dateFin ? { date: form.dateFin, typeContrat: form.typeContrat || null } : null}
            />
          )}

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
function Verrou({ label }: { label: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1 text-gray-400">{label}</label>
      <div className="w-full rounded-lg px-4 py-3 bg-gray-200 text-gray-500 text-sm cursor-not-allowed select-none">
        🔒 Non disponible dans la version démo
      </div>
    </div>
  );
}
