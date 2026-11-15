"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Admin › Abonnements : affiche les textes d'une formule tels que le client les voit,
 * avec un stylo ✏️ pour les modifier (accroche + une ligne par avantage).
 */
export default function EditeurTexteFormule({ cle, titre, message, lignes, modifie, avecLignes = true, aide }: {
  cle: string; titre?: string; message: string; lignes: string[]; modifie: boolean; avecLignes?: boolean; aide?: string;
}) {
  const router = useRouter();
  const [edition, setEdition] = useState(false);
  const [m, setM] = useState(message);
  const [l, setL] = useState(lignes.join("\n"));
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function enregistrer() {
    setEnvoi(true); setErreur(null);
    const r = await fetch("/api/admin/textes-formules", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cle, message: m, lignes: l.split("\n") }) });
    setEnvoi(false);
    if (!r.ok) { setErreur((await r.json().catch(() => ({}))).erreur || "Enregistrement impossible"); return; }
    setEdition(false);
    router.refresh();
  }
  async function revenir() {
    if (!confirm("Revenir au texte d'origine de la grille ?")) return;
    await fetch(`/api/admin/textes-formules?cle=${encodeURIComponent(cle)}`, { method: "DELETE" });
    setEdition(false);
    router.refresh();
  }

  if (!edition) {
    return (
      <div className="relative group">
        <button type="button" onClick={() => { setM(message); setL(lignes.join("\n")); setEdition(true); }} title="Modifier le texte vu par les clients" aria-label={`Modifier le texte${titre ? ` de ${titre}` : ""}`}
          className="absolute -top-1 right-0 w-7 h-7 rounded-full bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-500 hover:text-white text-sm">✏️</button>
        <div className="pr-8">
          {titre && <p className="font-bold text-sm mb-1">{titre}</p>}
          {modifie && <span className="inline-block text-[10px] font-bold uppercase text-orange-600 mb-1">texte personnalisé</span>}
          {message && <p className="text-xs italic text-gray-500 mb-1">{message}</p>}
          {avecLignes && (
            <ul className="text-xs flex flex-col gap-1">
              {lignes.map((f, i) => (
                <li key={i}>{f.startsWith("€ ") ? <span className="text-gray-500">€ {f.slice(2)}</span> : f.startsWith("✦") ? <strong className="text-orange-600">{f}</strong> : <><span style={{ color: "#16a34a", fontWeight: 700 }}>✓</span> {f}</>}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 text-left">
      {titre && <p className="font-bold text-sm">{titre}</p>}
      <label className="text-xs font-semibold text-gray-600">{avecLignes ? "Phrase d'accroche (facultative)" : "Texte"}
        <textarea value={m} onChange={(e) => setM(e.target.value)} rows={avecLignes ? 2 : 3} className="border rounded-lg px-2 py-1 w-full text-xs font-normal mt-1" />
      </label>
      {avecLignes && (
        <label className="text-xs font-semibold text-gray-600">Une ligne par avantage
          <textarea value={l} onChange={(e) => setL(e.target.value)} rows={Math.min(14, Math.max(5, lignes.length + 1))} className="border rounded-lg px-2 py-1 w-full text-xs font-normal mt-1" />
          <span className="block font-normal text-gray-400 mt-1">{aide ?? "Commencez une ligne par « € » pour une option payante."}</span>
        </label>
      )}
      {erreur && <p className="text-xs text-red-700">{erreur}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={enregistrer} disabled={envoi} className="bg-orange-500 text-white rounded-lg px-3 py-1 text-xs font-semibold disabled:opacity-50">{envoi ? "…" : "💾 Enregistrer"}</button>
        <button type="button" onClick={() => setEdition(false)} className="border rounded-lg px-3 py-1 text-xs">Annuler</button>
        {modifie && <button type="button" onClick={revenir} className="text-xs text-gray-500 underline">Texte d&apos;origine</button>}
      </div>
    </div>
  );
}
