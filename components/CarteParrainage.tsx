"use client";

import { useState } from "react";

/** Carte client « Parrainez une entreprise » : code et lien à partager */
export default function CarteParrainage({ code, lien, filleuls, recompense, remises }: {
  code: string; lien: string; filleuls: number; recompense: string | null; remises: string[];
}) {
  const [copie, setCopie] = useState(false);
  const copier = () => {
    navigator.clipboard?.writeText(lien).then(() => { setCopie(true); setTimeout(() => setCopie(false), 2000); }).catch(() => {});
  };
  return (
    <div className="bg-white rounded-xl shadow p-6 col-span-2">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold">🎁 Parrainez une entreprise</h2>
          <p className="text-sm text-gray-500 mt-1">Une entreprise de votre réseau a besoin d&apos;aide en RH ou en paie ? Partagez votre lien : elle sera rattachée à votre compte.</p>
          {recompense && <p className="text-sm mt-1 font-semibold text-green-700">{recompense}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-gray-500">Votre code</p>
          <p className="text-2xl font-bold tracking-wider">{code}</p>
        </div>
      </div>
      <div className="flex gap-2 items-center mt-4 flex-wrap">
        <code className="text-xs bg-gray-100 rounded px-2 py-2 break-all flex-1" style={{ minWidth: 0 }}>{lien}</code>
        <button type="button" onClick={copier} className="bg-orange-500 text-white rounded-lg px-4 py-2 font-semibold text-sm hover:bg-orange-600">{copie ? "✅ Copié" : "Copier le lien"}</button>
      </div>
      <p className="text-sm text-gray-600 mt-3">{filleuls === 0 ? "Aucune entreprise parrainée pour l'instant." : `${filleuls} entreprise${filleuls > 1 ? "s" : ""} parrainée${filleuls > 1 ? "s" : ""}. Merci ! 🙏`}</p>
      {remises.length > 0 && <ul className="text-sm text-green-700 mt-2">{remises.map((r, i) => <li key={i}>• {r}</li>)}</ul>}
    </div>
  );
}
