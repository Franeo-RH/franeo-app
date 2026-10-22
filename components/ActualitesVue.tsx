"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type ActuItem = {
  id: string;
  titre: string;
  contenu: string;
  thematique: string;
  date: string;
  mois: string;
};

export type Tuile = { nom: string; total: number };

type StyleTheme = { icone: string; tuile: string; barre: string };

const STYLES: Record<string, StyleTheme> = {
  "Général": { icone: "📰", tuile: "bg-blue-100 text-blue-900 hover:bg-blue-200", barre: "bg-blue-200" },
  "Paie": { icone: "💶", tuile: "bg-green-100 text-green-900 hover:bg-green-200", barre: "bg-green-200" },
  "Admin RH": { icone: "🗂️", tuile: "bg-purple-100 text-purple-900 hover:bg-purple-200", barre: "bg-purple-200" },
  "Entreprises": { icone: "🏢", tuile: "bg-sky-100 text-sky-900 hover:bg-sky-200", barre: "bg-sky-200" },
  "Gestion RH": { icone: "👥", tuile: "bg-teal-100 text-teal-900 hover:bg-teal-200", barre: "bg-teal-200" },
  "Recrutement": { icone: "🎯", tuile: "bg-yellow-100 text-yellow-900 hover:bg-yellow-200", barre: "bg-yellow-200" },
  "Juridique": { icone: "⚖️", tuile: "bg-rose-100 text-rose-900 hover:bg-rose-200", barre: "bg-rose-200" },
  "Formation": { icone: "🎓", tuile: "bg-orange-100 text-orange-900 hover:bg-orange-200", barre: "bg-orange-200" },
};
const STYLE_DEFAUT: StyleTheme = { icone: "📄", tuile: "bg-gray-100 text-gray-900 hover:bg-gray-200", barre: "bg-gray-200" };

function styleDe(theme: string) {
  return STYLES[theme] ?? STYLE_DEFAUT;
}

const LONGUEUR_RESUME = 260;

function resumer(texte: string) {
  const propre = texte.trim();
  if (propre.length <= LONGUEUR_RESUME) return propre;
  const debut = propre.slice(0, LONGUEUR_RESUME);
  const espace = debut.lastIndexOf(" ");
  return `${(espace > 150 ? debut.slice(0, espace) : debut).trimEnd()}…`;
}

/* Fenêtre de lecture d'une actualité */
function Lecture({ actu, onClose }: { actu: ActuItem; onClose: () => void }) {
  useEffect(() => {
    function surTouche(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", surTouche);
    const ancien = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", surTouche);
      document.body.style.overflow = ancien;
    };
  }, [onClose]);

  const st = styleDe(actu.thematique);

  return (
    <div className="fond-lecture fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="ouvre-fiche bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${st.barre} px-6 py-4 flex items-center justify-between rounded-t-2xl`}>
          <span className="font-semibold text-gray-800">
            {st.icone} {actu.thematique}
          </span>
          <button onClick={onClose} aria-label="Fermer" className="text-gray-600 hover:text-black text-xl leading-none">
            ✕
          </button>
        </div>
        <div className="p-8">
          <p className="text-gray-400 text-sm">Publié le {actu.date}</p>
          <h2 className="text-2xl font-bold mt-2">{actu.titre}</h2>
          <p className="text-gray-700 mt-5 whitespace-pre-line leading-relaxed">{actu.contenu}</p>
        </div>
      </div>
    </div>
  );
}

/* Petit document de taille fixe, avec son titre et sa date dedans */
function Document({ actu, onOpen }: { actu: ActuItem; onOpen: () => void }) {
  const st = styleDe(actu.thematique);
  return (
    <button onClick={onOpen} className="group text-left block" aria-label={`Ouvrir : ${actu.titre}`}>
      <div className="w-32 h-36 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition duration-200 group-hover:shadow-md group-hover:-translate-y-1 flex flex-col">
        <div className={`${st.barre} h-7 shrink-0 flex items-center justify-between px-2`}>
          <span className="text-sm">{st.icone}</span>
          <span className="text-[9px] font-semibold text-gray-700">{actu.date}</span>
        </div>
        <div className="p-2 flex-1 overflow-hidden">
          <p className="text-[11px] font-bold text-gray-800 leading-tight line-clamp-6 break-words">{actu.titre}</p>
        </div>
      </div>
    </button>
  );
}

export default function ActualitesVue({
  vue,
  theme,
  tuiles,
  une,
  items,
  total,
}: {
  vue: "accueil" | "theme";
  theme?: string;
  tuiles: Tuile[];
  une: ActuItem | null;
  items: ActuItem[];
  total: number;
}) {
  const [ouverte, setOuverte] = useState<ActuItem | null>(null);
  const [visibles, setVisibles] = useState(10);

  const style = (
    <style>{`
      @keyframes ouvreFiche { 0% { opacity: 0; transform: translateY(24px) scale(0.94); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes fondLecture { 0% { opacity: 0; } 100% { opacity: 1; } }
      @keyframes arriveTuile { 0% { opacity: 0; transform: translateY(14px); } 100% { opacity: 1; transform: translateY(0); } }
      .ouvre-fiche { animation: ouvreFiche 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
      .fond-lecture { animation: fondLecture 0.25s ease-out; }
      .arrive { animation: arriveTuile 0.4s ease-out both; }
      @media (prefers-reduced-motion: reduce) { .ouvre-fiche, .fond-lecture, .arrive { animation: none; } }
    `}</style>
  );

  /* ─────────── Vue d'accueil : à la une + grandes tuiles ─────────── */
  if (vue === "accueil") {
    return (
      <div>
        {style}

        {une && (
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-3">✨ À la une</h2>
            <article className="arrive bg-white rounded-2xl shadow-md border border-orange-100 p-6">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500 text-white">Dernière publication</span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-600">{une.thematique}</span>
                <span className="text-gray-400 text-sm">Publié le {une.date}</span>
              </div>
              <h3 className="text-xl font-bold mt-3">{une.titre}</h3>
              <p className="text-gray-600 mt-3 leading-relaxed whitespace-pre-line">{resumer(une.contenu)}</p>
              <button onClick={() => setOuverte(une)} className="mt-4 text-sm font-semibold text-orange-500 hover:text-orange-600">
                Lire l&apos;actualité en entier →
              </button>
            </article>
          </section>
        )}

        <h2 className="text-xl font-bold mb-3">Thématiques</h2>
        {tuiles.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">Aucune actualité pour le moment.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tuiles.map((t, i) => {
              const st = styleDe(t.nom);
              return (
                <Link
                  key={t.nom}
                  href={`/client/actualites?theme=${encodeURIComponent(t.nom)}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className={`arrive ${st.tuile} rounded-2xl px-6 py-5 flex items-center gap-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md`}
                >
                  <span className="text-4xl">{st.icone}</span>
                  <span className="flex-1">
                    <span className="block text-xl font-bold">{t.nom}</span>
                    <span className="block text-sm opacity-70">
                      {t.total} actualité{t.total > 1 ? "s" : ""}
                    </span>
                  </span>
                  <span className="text-2xl opacity-50">›</span>
                </Link>
              );
            })}
          </div>
        )}

        {ouverte && <Lecture actu={ouverte} onClose={() => setOuverte(null)} />}
      </div>
    );
  }

  /* ─────────── Vue d'une thématique : petits documents de taille fixe ─────────── */
  const st = styleDe(theme || "");
  const groupes: { mois: string; liste: ActuItem[] }[] = [];
  for (const a of items.slice(0, visibles)) {
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.mois === a.mois) dernier.liste.push(a);
    else groupes.push({ mois: a.mois, liste: [a] });
  }
  const restantes = items.length - visibles;

  return (
    <div>
      {style}

      <Link href="/client/actualites" className="text-sm font-semibold text-orange-500 hover:text-orange-600">
        ← Toutes les thématiques
      </Link>

      <div className={`${st.tuile.split(" hover:")[0]} rounded-2xl px-6 py-5 flex items-center gap-4 mt-4 mb-8`}>
        <span className="text-4xl">{st.icone}</span>
        <div>
          <h2 className="text-2xl font-bold">{theme}</h2>
          <p className="text-sm opacity-70">
            {total} actualité{total > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {groupes.map((g) => (
        <section key={g.mois} className="mb-8">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 first-letter:uppercase">{g.mois}</h3>
          <div className="flex flex-wrap gap-4">
            {g.liste.map((a, i) => (
              <div key={a.id} className="arrive" style={{ animationDelay: `${i * 40}ms` }}>
                <Document actu={a} onOpen={() => setOuverte(a)} />
              </div>
            ))}
          </div>
        </section>
      ))}

      {restantes > 0 && (
        <button
          onClick={() => setVisibles(visibles + 10)}
          className="bg-white rounded-xl shadow px-5 py-3 text-sm font-semibold text-orange-500 hover:bg-orange-50 transition"
        >
          Voir {Math.min(10, restantes)} de plus ({restantes} restante{restantes > 1 ? "s" : ""})
        </button>
      )}

      {ouverte && <Lecture actu={ouverte} onClose={() => setOuverte(null)} />}
    </div>
  );
}