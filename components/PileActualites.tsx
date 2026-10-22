"use client";

import { useState } from "react";
import Link from "next/link";

export type ActuItem = {
  id: string;
  titre: string;
  date: string;
  contenu: string;
  thematique: string;
};

const LONGUEUR_RESUME = 260;

function resumer(texte: string) {
  const propre = texte.trim();
  if (propre.length <= LONGUEUR_RESUME) return { texte: propre, coupe: false };
  const debut = propre.slice(0, LONGUEUR_RESUME);
  const espace = debut.lastIndexOf(" ");
  const net = (espace > 150 ? debut.slice(0, espace) : debut).trimEnd();
  return { texte: `${net}…`, coupe: true };
}

export default function PileActualites({
  theme,
  total,
  items,
  pas = 5,
  lienTout,
}: {
  theme: string;
  total: number;
  items: ActuItem[];
  pas?: number;
  lienTout?: string;
}) {
  const [selectionId, setSelectionId] = useState<string | undefined>(items[0]?.id);
  const [ouverte, setOuverte] = useState(false);
  const [visibles, setVisibles] = useState(pas);

  const selection = items.find((i) => i.id === selectionId) ?? items[0];
  if (!selection) return null;

  const affichees = items.slice(0, visibles);
  const autres = affichees.filter((i) => i.id !== selection.id);
  const restantes = items.length - visibles;
  const estLaDerniere = selection.id === items[0].id;
  const { texte: resume, coupe } = resumer(selection.contenu);

  function choisir(id: string) {
    setSelectionId(id);
    setOuverte(false);
  }

  return (
    <section>
      <style>{`
        @keyframes ficheEntree {
          0%   { opacity: 0; transform: translateY(28px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .fiche-entree { animation: ficheEntree 0.45s cubic-bezier(0.22, 1, 0.36, 1); }
        @media (prefers-reduced-motion: reduce) {
          .fiche-entree { animation: none; }
        }
      `}</style>

      {/* En-tête de la pile */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">🗂️</span>
          <h2 className="text-lg font-bold text-gray-800">{theme}</h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
            {total} actualité{total > 1 ? "s" : ""}
          </span>
        </div>
        {lienTout && total > items.length && (
          <Link href={lienTout} className="text-sm font-semibold text-orange-500 hover:text-orange-600">
            Tout voir →
          </Link>
        )}
      </div>

      {/* Fiche du dessus */}
      <article
        key={selection.id}
        className="fiche-entree relative z-20 bg-white rounded-xl shadow-md border border-orange-100 p-6"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {estLaDerniere && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500 text-white">
              ✨ Dernière publication
            </span>
          )}
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-600">
            {selection.thematique}
          </span>
          <span className="text-gray-400 text-sm">{selection.date}</span>
        </div>

        <h3 className="text-xl font-bold mt-3">{selection.titre}</h3>
        <p className="text-gray-600 mt-3 whitespace-pre-line leading-relaxed">
          {ouverte ? selection.contenu : resume}
        </p>

        {coupe && (
          <button
            onClick={() => setOuverte(!ouverte)}
            className="mt-4 text-sm font-semibold text-orange-500 hover:text-orange-600"
          >
            {ouverte ? "Réduire ▴" : "Lire la suite ▾"}
          </button>
        )}
      </article>

      {/* Fiches en dessous : seuls les titres dépassent */}
      {autres.map((a, i) => (
        <button
          key={a.id}
          onClick={() => choisir(a.id)}
          aria-label={`Ouvrir l'actualité : ${a.titre}`}
          style={{ zIndex: 10 - i }}
          className="relative block w-full text-left -mt-3 pt-6 pb-3 px-6 bg-white rounded-b-xl rounded-t-xl border border-gray-200 shadow-sm transition hover:bg-orange-50 hover:border-orange-200 cursor-pointer"
        >
          <span className="flex items-center justify-between gap-4">
            <span className="font-semibold text-gray-700 truncate">{a.titre}</span>
            <span className="text-xs text-gray-400 shrink-0">{a.date}</span>
          </span>
        </button>
      ))}

      {restantes > 0 && (
        <button
          onClick={() => setVisibles(visibles + pas)}
          className="mt-4 text-sm font-semibold text-orange-500 hover:text-orange-600"
        >
          Voir {Math.min(pas, restantes)} titre{Math.min(pas, restantes) > 1 ? "s" : ""} de plus ({restantes} restant{restantes > 1 ? "s" : ""})
        </button>
      )}
    </section>
  );
}