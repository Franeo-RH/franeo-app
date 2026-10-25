"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ModaleSurcout from "@/components/ModaleSurcout";
import type { Surcout } from "@/lib/surcout";
import { TYPES_RAPPEL, formaterDateFR } from "@/lib/rappels";

const ONGLETS = ["Infos personnelles", "Poste", "Salaire", "Documents & échéances"];

type RappelSaisi = { type: string; libelle: string; dateEcheance: string };

export default function NouveauSalarie() {
  const router = useRouter();
  const [onglet, setOnglet] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [surcout, setSurcout] = useState<Surcout | null>(null);
  const [prenom, setPrenom] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
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

  // Échéances saisies avant l'enregistrement
  const [rappels, setRappels] = useState<RappelSaisi[]>([]);
  const [nouveau, setNouveau] = useState<RappelSaisi>({ type: TYPES_RAPPEL[0].code, libelle: "", dateEcheance: "" });
  const [erreurRappel, setErreurRappel] = useState("");

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(data => {
      if (data.prenom) setPrenom(data.prenom);
      if (data.permissions) setPermissions(data.permissions);
    });
    fetch("/api/demo/statut").then(r => r.json()).then(d => setDemo(!!d.demo)).catch(() => {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function ajouterRappel() {
    setErreurRappel("");
    if (!nouveau.dateEcheance) return setErreurRappel("Choisissez une date d'échéance.");
    if (nouveau.type === "AUTRE" && !nouveau.libelle.trim()) return setErreurRappel("Précisez le libellé de l'échéance.");
    setRappels([...rappels, nouveau]);
    setNouveau({ type: TYPES_RAPPEL[0].code, libelle: "", dateEcheance: "" });
  }

  async function handleSubmit() {
    await envoyer(false);
  }

  async function envoyer(accepteSurcout: boolean) {
    setChargement(true);
    setErreur("");
    const res = await fetch("/api/salaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, rappels, accepteSurcout }),
    });
    // Supplément : on demande l'accord du client
    if (res.status === 402) {
      const data = await res.json();
      if (data.surcoutRequis) {
        setSurcout(data.surcout);
        setChargement(false);
        return;
      }
    }
    if (!res.ok) {
      const data = await res.json();
      const message = data.erreur || "Une erreur est survenue";
      setErreur(message);
      if (message.toLowerCase().includes("matricule")) setOnglet(0);
      setChargement(false);
      setSurcout(null);
      return;
    }
    setSurcout(null);
    router.push("/client/salaries");
  }

  // Champ de saisie, ou bloc gris verrouillé dans la version démo
  function champ(label: string, name: keyof typeof form, type = "text", libre = false) {
    if (demo && !libre) return <Verrou key={name} label={label} />;
    return <Field key={name} label={label} name={name} value={form[name]} onChange={handleChange} type={type} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="CLIENT" prenom={prenom} permissions={permissions} />
      <div className="flex">
        <Sidebar role="CLIENT" />
        <main className="flex-1 p-10">
          <div className="bg-white rounded-xl shadow p-8 mb-6">
            <h1 className="text-3xl font-bold">➕ Ajouter un salarié</h1>
            {demo && (
              <p className="text-sm text-blue-600 mt-2">
                🧪 Version démo : seuls le prénom, le poste, les dates de début et de fin et le salaire sont modifiables. Maximum 30 salariés.
              </p>
            )}
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

            {onglet === 3 && (
              <div>
                <p className="text-gray-500 text-sm mb-4">
                  Aucun document à envoyer : notez simplement les dates à ne pas oublier (avenant, titre de séjour, visite médicale…).
                  Elles s&apos;afficheront sur votre tableau de bord.
                </p>

                <div className="grid grid-cols-4 gap-3 items-end mb-3">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Type</label>
                    <select
                      value={nouveau.type}
                      onChange={(e) => setNouveau({ ...nouveau, type: e.target.value })}
                      className="w-full border rounded-lg px-3 py-3"
                    >
                      {TYPES_RAPPEL.map((t) => (
                        <option key={t.code} value={t.code}>{t.icone} {t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">{nouveau.type === "AUTRE" ? "Libellé *" : "Précision"}</label>
                    <input
                      value={nouveau.libelle}
                      onChange={(e) => setNouveau({ ...nouveau, libelle: e.target.value })}
                      className="w-full border rounded-lg px-3 py-3"
                      placeholder="Facultatif"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Date d&apos;échéance *</label>
                    <input
                      type="date"
                      value={nouveau.dateEcheance}
                      onChange={(e) => setNouveau({ ...nouveau, dateEcheance: e.target.value })}
                      className="w-full border rounded-lg px-3 py-3"
                    />
                  </div>
                  <button onClick={ajouterRappel} className="bg-orange-500 text-white px-4 py-3 rounded-lg font-semibold hover:bg-orange-600 transition">
                    ➕ Ajouter
                  </button>
                </div>
                {erreurRappel && <p className="text-red-500 text-sm mb-3">{erreurRappel}</p>}

                {rappels.length === 0 ? (
                  <p className="text-gray-400 text-sm">Aucune échéance pour le moment.</p>
                ) : (
                  <ul className="divide-y border rounded-lg">
                    {rappels.map((r, i) => {
                      const t = TYPES_RAPPEL.find((x) => x.code === r.type);
                      return (
                        <li key={i} className="flex justify-between items-center px-4 py-3 text-sm">
                          <span>
                            {t?.icone} <strong>{t?.label}</strong>
                            {r.libelle ? ` — ${r.libelle}` : ""} · {formaterDateFR(r.dateEcheance)}
                          </span>
                          <button onClick={() => setRappels(rappels.filter((_, k) => k !== i))} className="text-red-500 hover:underline">
                            Retirer
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
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
              <button onClick={handleSubmit} disabled={chargement} className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition">
                {chargement ? "Enregistrement..." : "✅ Enregistrer"}
              </button>
              {onglet < ONGLETS.length - 1 && (
                <button onClick={() => setOnglet(onglet + 1)} className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition">
                  Suivant →
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
      {surcout && (
        <ModaleSurcout
          surcout={surcout}
          chargement={chargement}
          onAnnuler={() => { setSurcout(null); setChargement(false); }}
          onAccepter={() => envoyer(true)}
        />
      )}
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
