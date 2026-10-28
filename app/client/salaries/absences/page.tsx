"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BoutonExport from "@/components/BoutonExport";

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

const TYPES_MAP: Record<string, string> = {
  CONGE_PAYE: "🏖️ Congés payés",
  RTT: "📅 RTT",
  CONGE_SANS_SOLDE: "💼 Congé sans solde",
  CONGE_EXCEPTIONNEL: "⭐ Congé exceptionnel",
  CONGE_NAISSANCE: "👶 Congé naissance",
  MATERNITE_PATERNITE: "👨‍👩‍👦 Maternité / Paternité",
  MALADIE: "🤒 Maladie",
  ABSENCE_NON_REMUNEREE: "❌ Absence non rémunérée",
};

type Salarie = { id: string; nom: string; prenom: string };
type Absence = {
  id: string;
  type: string;
  dateDebut: string;
  dateFin: string;
  commentaire: string | null;
  statut: string;
  declareeParSalarie?: boolean;
  motifRefus?: string | null;
  salarie: { nom: string; prenom: string };
};

export default function AbsencesClient() {
  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);

  const [form, setForm] = useState({
    salarieId: "",
    type: "CONGE_PAYE",
    dateDebut: "",
    dateFin: "",
    commentaire: "",
  });

  useEffect(() => {
    fetch("/api/salaries").then(r => r.json()).then(setSalaries);
    fetch("/api/absences").then(r => r.json()).then(setAbsences);
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
    setForm({ salarieId: "", type: "CONGE_PAYE", dateDebut: "", dateFin: "", commentaire: "" });
    setAfficherFormulaire(false);
    fetch("/api/absences").then(r => r.json()).then(setAbsences);
    setChargement(false);
  }

  async function decider(id: string, statut: "Validé" | "Refusé") {
    let motifRefus: string | null = null;
    if (statut === "Refusé") {
      motifRefus = prompt("Motif du refus (visible par le salarié) :");
      if (motifRefus === null) return;
    }
    const res = await fetch(`/api/absences/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut, motif: motifRefus }),
    });
    if (res.ok) {
      setAbsences(absences.map(a => a.id === id ? { ...a, statut, motifRefus } : a));
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.erreur || "Erreur lors de la mise à jour");
    }
  }

  async function handleSupprimer(id: string) {
    const confirmation = confirm("Supprimer cette absence ?");
    if (!confirmation) return;

    const res = await fetch(`/api/absences/${id}`, { method: "DELETE" });

    if (res.ok) {
      setAbsences(absences.filter(a => a.id !== id));
    } else {
      alert("Erreur lors de la suppression");
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="CLIENT" prenom={prenom} permissions={permissions} />
      <div className="flex">
        <Sidebar role="CLIENT" />
        <main className="flex-1 p-10">

          <div className="bg-white rounded-xl shadow p-8 mb-6 flex justify-between items-center">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <h1 className="text-3xl font-bold">🏖️ Absences</h1>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <BoutonExport type="client-absences" label="📊 Exporter Excel" params={{ toutes: "1" }} />
              </div>
            </div>
            <button
              onClick={() => setAfficherFormulaire(!afficherFormulaire)}
              className="bg-orange-500 text-white px-5 py-2 rounded-lg font-semibold hover:bg-orange-600 transition"
            >
              {afficherFormulaire ? "← Annuler" : "➕ Déclarer une absence"}
            </button>
          </div>

          {afficherFormulaire && (
            <div className="bg-white rounded-xl shadow p-8 mb-6">
              <h2 className="text-xl font-bold mb-6">Nouvelle absence</h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Salarié *</label>
                    <select name="salarieId" value={form.salarieId} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-lg px-4 py-4 text-lg focus:border-orange-500 focus:outline-none" required>
                      <option value="">Sélectionner un salarié...</option>
                      {salaries.map((s) => (
                        <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Type *</label>
                    <select name="type" value={form.type} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-lg px-4 py-4 text-lg focus:border-orange-500 focus:outline-none">
                      {TYPES_ABSENCE.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2">📅 Date de début *</label>
                    <input type="date" name="dateDebut" value={form.dateDebut} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-lg px-4 py-4 text-lg focus:border-orange-500 focus:outline-none cursor-pointer" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">📅 Date de fin *</label>
                    <input type="date" name="dateFin" value={form.dateFin} onChange={handleChange} min={form.dateDebut} className="w-full border-2 border-gray-200 rounded-lg px-4 py-4 text-lg focus:border-orange-500 focus:outline-none cursor-pointer" required />
                  </div>
                </div>
                {form.dateDebut && form.dateFin && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-orange-600 font-semibold text-sm">
                      📊 Durée : {Math.ceil((new Date(form.dateFin).getTime() - new Date(form.dateDebut).getTime()) / (1000 * 60 * 60 * 24)) + 1} jour(s)
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold mb-1">Commentaire</label>
                  <textarea name="commentaire" value={form.commentaire} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-lg px-4 py-4 h-24 resize-none focus:border-orange-500 focus:outline-none" placeholder="Précisions..." />
                </div>
                {erreur && <p className="text-red-500">{erreur}</p>}
                {succes && <p className="text-green-500">{succes}</p>}
                <div className="flex justify-end">
                  <button type="submit" disabled={chargement} className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition">
                    {chargement ? "Enregistrement..." : "✅ Enregistrer"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-xl shadow p-8">
            <h2 className="text-xl font-bold mb-6">Mes absences</h2>
            {absences.length === 0 ? (
              <p className="text-gray-500">Aucune absence déclarée.</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3">Salarié</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Du</th>
                    <th className="pb-3">Au</th>
                    <th className="pb-3">Durée</th>
                    <th className="pb-3">Commentaire</th>
                    <th className="pb-3">Statut</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {absences.map((a) => {
                    const jours = Math.ceil((new Date(a.dateFin).getTime() - new Date(a.dateDebut).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    return (
                      <tr key={a.id} className="border-b hover:bg-gray-50 transition">
                        <td className="py-3">{a.salarie.prenom} {a.salarie.nom}</td>
                        <td className="py-3">{TYPES_MAP[a.type] || a.type}</td>
                        <td className="py-3">{new Date(a.dateDebut).toLocaleDateString("fr-FR")}</td>
                        <td className="py-3">{new Date(a.dateFin).toLocaleDateString("fr-FR")}</td>
                        <td className="py-3 font-semibold">{jours} jour(s)</td>
                        <td className="py-3 text-gray-500 text-sm">{a.commentaire || "—"}</td>
                        <td className="py-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            a.statut === "En attente" ? "bg-orange-100 text-orange-600" :
                            a.statut === "Validé" ? "bg-green-100 text-green-600" :
                            "bg-red-100 text-red-600"
                          }`}>
                            {a.statut}
                          </span>
                          {a.declareeParSalarie && <div className="text-xs text-gray-500 mt-1">📱 déclarée par le salarié</div>}
                          {a.statut === "Refusé" && a.motifRefus && <div className="text-xs text-red-600 mt-1">Motif : {a.motifRefus}</div>}
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          {a.declareeParSalarie && a.statut === "En attente" && (
                            <>
                              <button onClick={() => decider(a.id, "Validé")} style={{ background: "#16a34a", color: "#ffffff", borderRadius: "6px", padding: "4px 8px", fontSize: "13px", fontWeight: 600, marginRight: "6px" }}>Valider</button>
                              <button onClick={() => decider(a.id, "Refusé")} style={{ background: "#dc2626", color: "#ffffff", borderRadius: "6px", padding: "4px 8px", fontSize: "13px", fontWeight: 600, marginRight: "6px" }}>Refuser</button>
                            </>
                          )}
                          <button onClick={() => handleSupprimer(a.id)} className="text-red-500 hover:text-red-700 font-semibold text-sm">
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}