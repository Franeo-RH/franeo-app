"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import ModaleSurcout from "@/components/ModaleSurcout";
import type { Surcout } from "@/lib/surcout";

type Resultat = { crees: number; demandes?: number; erreurs: { ligne: number; raisons: string[] }[]; fichierErreurs: string | null };

function telecharger(base64: string, nom: string) {
  const octets = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([octets], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportSalaries({ entreprises }: { entreprises?: { id: string; nom: string }[] } = {}) {
  const admin = !!entreprises;
  const retour = admin ? "/admin/salaries" : "/client/salaries";
  const [entrepriseId, setEntrepriseId] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [surcout, setSurcout] = useState<Surcout | null>(null);
  const [resultat, setResultat] = useState<Resultat | null>(null);

  async function importer(accepteSurcout = false) {
    if (!fichier) return;
    if (admin && !entrepriseId) { setErreur("Choisissez l'entreprise."); return; }
    setEnvoi(true);
    setErreur("");
    setResultat(null);
    try {
      const form = new FormData();
      form.append("fichier", fichier);
      if (admin) form.append("entrepriseId", entrepriseId);
      if (accepteSurcout) form.append("accepteSurcout", "1");
      const res = await fetch("/api/salaries/import", { method: "POST", body: form });
      const data = await res.json();
      if (res.status === 402 && data.surcoutRequis) {
        // Supplément : on demande l'accord du client
        setSurcout(data.surcout);
      } else if (!res.ok) {
        setSurcout(null);
        setErreur(data.erreur || "L'import a échoué.");
      } else {
        setSurcout(null);
        setResultat(data);
        if (data.fichierErreurs) telecharger(data.fichierErreurs, "salaries-erreurs.xlsx");
        setFichier(null);
        if (input.current) input.current.value = "";
      }
    } catch {
      setErreur("Problème de connexion, réessayez.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <Link href={retour} className="text-sm text-gray-500 hover:underline">← Retour aux salariés</Link>
        <h1 className="text-2xl font-bold mt-2">Importer des salariés</h1>
        <p className="text-gray-500 text-sm mt-1">Ajoutez plusieurs salariés d'un coup depuis un fichier Excel.</p>
      </div>

      {admin && (
        <div className="bg-white border rounded-2xl p-5 space-y-3">
          <label className="font-semibold block" htmlFor="imp-ent">Entreprise *</label>
          <select id="imp-ent" value={entrepriseId} onChange={(e) => setEntrepriseId(e.target.value)} className="w-full border rounded-lg px-3 py-2">
            <option value="">Choisir l&apos;entreprise…</option>
            {entreprises!.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
          </select>
          <p className="text-xs text-gray-500">En admin, les salariés sont créés directement (sans demande de validation).</p>
        </div>
      )}

      <div className="bg-white border rounded-2xl p-5 space-y-3">
        <h2 className="font-semibold">1. Téléchargez le modèle</h2>
        <p className="text-sm text-gray-500">Remplissez-le (une ligne par salarié). Prénom, nom et poste sont obligatoires. Le matricule est facultatif mais doit être unique.</p>
        <a href="/api/salaries/import/modele" className="inline-block bg-gray-100 hover:bg-gray-200 text-sm font-medium px-4 py-2 rounded-lg">
          📥 Télécharger le modèle Excel
        </a>
      </div>

      <div className="bg-white border rounded-2xl p-5 space-y-3">
        <h2 className="font-semibold">2. Envoyez votre fichier</h2>
        <input
          ref={input}
          type="file"
          accept=".xlsx"
          onChange={(e) => {
            setFichier(e.target.files?.[0] ?? null);
            setResultat(null);
            setErreur("");
          }}
          className="block text-sm"
        />
        <button
          onClick={() => importer()}
          disabled={!fichier || envoi}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          {envoi ? "Import en cours…" : "Importer"}
        </button>
        {erreur && <p className="text-sm text-red-600">{erreur}</p>}
      </div>

      {resultat && (
        <div className="bg-white border rounded-2xl p-5 space-y-3">
          {resultat.demandes ? (
            <p className="font-semibold text-green-700">
              📨 {resultat.demandes} demande(s) d&apos;ajout envoyée(s) à votre gestionnaire. Les salariés apparaîtront après validation (suivi dans « Mes demandes »).
            </p>
          ) : (
            <p className="font-semibold text-green-700">✅ {resultat.crees} salarié(s) importé(s).</p>
          )}
          {resultat.erreurs.length > 0 && (
            <>
              <p className="font-semibold text-red-600">
                {resultat.erreurs.length} ligne(s) refusée(s) — un fichier « salaries-erreurs.xlsx » vient d'être téléchargé.
              </p>
              <p className="text-sm text-gray-500">Corrigez-le (la colonne « Erreur » explique chaque refus) puis renvoyez-le ici : il suffit de le réimporter.</p>
              <ul className="text-sm text-gray-700 list-disc pl-5 max-h-56 overflow-auto">
                {resultat.erreurs.slice(0, 50).map((e) => (
                  <li key={e.ligne}>Ligne {e.ligne} : {e.raisons.join(" ; ")}</li>
                ))}
              </ul>
              {resultat.fichierErreurs && (
                <button onClick={() => telecharger(resultat.fichierErreurs!, "salaries-erreurs.xlsx")} className="text-sm underline text-gray-600">
                  Télécharger à nouveau le fichier d'erreurs
                </button>
              )}
            </>
          )}
          {resultat.crees > 0 && (
            <Link href={retour} className="inline-block text-sm font-medium text-green-700 hover:underline">Voir les salariés →</Link>
          )}
        </div>
      )}
      {surcout && (
        <ModaleSurcout
          surcout={surcout}
          chargement={envoi}
          onAnnuler={() => setSurcout(null)}
          onAccepter={() => importer(true)}
        />
      )}
    </div>
  );
}
