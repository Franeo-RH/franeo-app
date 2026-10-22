"use client";

import { useCallback, useEffect, useState } from "react";
import {
  STYLES_STATUT,
  TYPES_RAPPEL,
  formaterDateFR,
  joursAvant,
  libelleRappel,
  statutRappel,
  texteDelai,
  typeDe,
} from "@/lib/rappels";

export type RappelLite = {
  id: string;
  type: string;
  libelle: string | null;
  commentaire: string | null;
  traite: boolean;
  date: string;
};

type Formulaire = { type: string; libelle: string; dateEcheance: string; commentaire: string };

const VIDE: Formulaire = { type: "VISITE_PERIODIQUE", libelle: "", dateEcheance: "", commentaire: "" };

function normaliser(r: {
  id: string;
  type: string;
  libelle: string | null;
  commentaire: string | null;
  traite: boolean;
  dateEcheance: string;
}): RappelLite {
  return {
    id: r.id,
    type: r.type,
    libelle: r.libelle,
    commentaire: r.commentaire,
    traite: r.traite,
    date: String(r.dateEcheance).slice(0, 10),
  };
}

export default function RappelsSalarie({
  salarieId,
  initial,
  finContrat,
}: {
  salarieId: string;
  initial?: RappelLite[];
  finContrat?: { date: string; typeContrat?: string | null } | null;
}) {
  const [rappels, setRappels] = useState<RappelLite[]>(initial ?? []);
  const [charge, setCharge] = useState(initial !== undefined);
  const [form, setForm] = useState<Formulaire>(VIDE);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  const recharger = useCallback(async () => {
    const res = await fetch(`/api/salaries/${salarieId}/rappels`);
    if (res.ok) {
      const data = await res.json();
      setRappels(data.map(normaliser));
    }
    setCharge(true);
  }, [salarieId]);

  useEffect(() => {
    if (initial === undefined) recharger();
  }, [initial, recharger]);

  function ouvrirAjout() {
    setForm(VIDE);
    setEditionId(null);
    setErreur("");
    setFormOuvert(true);
  }

  function ouvrirEdition(r: RappelLite) {
    setForm({ type: r.type, libelle: r.libelle || "", dateEcheance: r.date, commentaire: r.commentaire || "" });
    setEditionId(r.id);
    setErreur("");
    setFormOuvert(true);
  }

  function fermer() {
    setFormOuvert(false);
    setEditionId(null);
    setForm(VIDE);
    setErreur("");
  }

  function changer(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function sauver() {
    setErreur("");
    if (!form.dateEcheance) {
      setErreur("Choisissez une date d'échéance.");
      return;
    }
    if (form.type === "AUTRE" && !form.libelle.trim()) {
      setErreur("Précisez le libellé de l'échéance.");
      return;
    }
    setEnCours(true);
    const res = await fetch(editionId ? `/api/rappels/${editionId}` : `/api/salaries/${salarieId}/rappels`, {
      method: editionId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEnCours(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErreur(d.erreur || "Une erreur est survenue");
      return;
    }
    fermer();
    await recharger();
  }

  async function basculerTraite(r: RappelLite) {
    await fetch(`/api/rappels/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ traite: !r.traite }),
    });
    await recharger();
  }

  async function supprimer(r: RappelLite) {
    if (!window.confirm(`Supprimer l'échéance « ${libelleRappel(r)} » ?`)) return;
    await fetch(`/api/rappels/${r.id}`, { method: "DELETE" });
    await recharger();
  }

  const triees = [...rappels].sort((a, b) => Number(a.traite) - Number(b.traite) || a.date.localeCompare(b.date));
  const joursFin = finContrat ? joursAvant(finContrat.date) : null;

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex justify-between items-start mb-4 gap-4">
        <div>
          <h2 className="text-lg font-bold">📁 Documents &amp; échéances</h2>
          <p className="text-xs text-gray-400 mt-1">Rappels de dates uniquement : aucun document n&apos;est stocké.</p>
        </div>
        {!formOuvert && (
          <button
            onClick={ouvrirAjout}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition shrink-0"
          >
            ➕ Ajouter une échéance
          </button>
        )}
      </div>

      {formOuvert && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Type d&apos;échéance</label>
              <select name="type" value={form.type} onChange={changer} className="w-full border rounded-lg px-3 py-2 bg-white">
                {TYPES_RAPPEL.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.icone} {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Date d&apos;échéance *</label>
              <input type="date" name="dateEcheance" value={form.dateEcheance} onChange={changer} className="w-full border rounded-lg px-3 py-2 bg-white" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold mb-1">
                {form.type === "AUTRE" ? "Libellé *" : "Précision (facultatif, ex : avenant n°2)"}
              </label>
              <input type="text" name="libelle" value={form.libelle} onChange={changer} className="w-full border rounded-lg px-3 py-2 bg-white" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold mb-1">Commentaire (facultatif)</label>
              <textarea name="commentaire" value={form.commentaire} onChange={changer} rows={2} className="w-full border rounded-lg px-3 py-2 bg-white" />
            </div>
          </div>
          {erreur && <p className="text-red-500 text-sm mt-3">{erreur}</p>}
          <div className="flex gap-3 mt-4">
            <button
              onClick={sauver}
              disabled={enCours}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50"
            >
              {enCours ? "Enregistrement..." : editionId ? "✅ Enregistrer" : "✅ Ajouter"}
            </button>
            <button onClick={fermer} className="bg-white border px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Fin de contrat : reprise automatique de la date de fin saisie dans le poste */}
      {finContrat && joursFin !== null && (
        <div className="flex items-start gap-3 border-b py-3">
          <span className="text-xl">⏳</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Fin de contrat{finContrat.typeContrat ? ` (${finContrat.typeContrat})` : ""}</p>
            <p className="text-xs text-gray-500">{formaterDateFR(finContrat.date)}</p>
            <p className="text-xs text-gray-400 mt-1">Reprise automatique de la date de fin du contrat</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STYLES_STATUT[statutRappel(joursFin)]}`}>
            {texteDelai(joursFin)}
          </span>
        </div>
      )}

      {!charge && <p className="text-gray-400 text-sm py-3">Chargement...</p>}

      {charge && triees.length === 0 && !finContrat && (
        <p className="text-gray-400 text-sm py-3">
          Aucune échéance pour le moment. Ajoutez par exemple la prochaine visite médicale ou la fin du titre de séjour.
        </p>
      )}

      {triees.map((r) => {
        const jours = joursAvant(r.date);
        const statut = statutRappel(jours, r.traite);
        return (
          <div key={r.id} className={`flex items-start gap-3 border-b py-3 ${r.traite ? "opacity-60" : ""}`}>
            <span className="text-xl">{typeDe(r.type).icone}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{libelleRappel(r)}</p>
              <p className="text-xs text-gray-500">{formaterDateFR(r.date)}</p>
              {r.commentaire && <p className="text-xs text-gray-400 mt-1 whitespace-pre-line">{r.commentaire}</p>}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STYLES_STATUT[statut]}`}>
              {texteDelai(jours, r.traite)}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => basculerTraite(r)}
                title={r.traite ? "Rouvrir" : "Marquer comme traité"}
                className="px-2 py-1 rounded hover:bg-gray-100 text-sm"
              >
                {r.traite ? "↩️" : "✅"}
              </button>
              <button onClick={() => ouvrirEdition(r)} title="Modifier" className="px-2 py-1 rounded hover:bg-gray-100 text-sm">
                ✏️
              </button>
              <button onClick={() => supprimer(r)} title="Supprimer" className="px-2 py-1 rounded hover:bg-gray-100 text-sm">
                🗑️
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}