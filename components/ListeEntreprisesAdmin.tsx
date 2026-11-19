"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type CarteEntreprise = {
  id: string; nom: string; ville: string | null; actif: boolean;
  formuleRH: string | null; formulePaie: string | null; cabinet: string | null;
  remisePct: number | null; codeParrainage: string | null; debutContrat: string;
  salaries: number; comptes: number; tickets: number; absences: number; demandesSalaries: number;
  caAnnee: number; caTotal: number; impaye: number; dernierMois: string | null;
  enCours: { label: string; href: string }[];
};

const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const FILTRES = [
  { id: "toutes", label: "Toutes" }, { id: "actives", label: "Actives" }, { id: "suspendues", label: "Suspendues" },
  { id: "paie", label: "Paie" }, { id: "rh", label: "Pack RH" }, { id: "cabinet", label: "Via cabinet" }, { id: "encours", label: "Actions en cours" },
] as const;

/** Admin : une carte par client avec ses chiffres, sa facturation et les raccourcis utiles */
export default function ListeEntreprisesAdmin({ entreprises, annee }: { entreprises: CarteEntreprise[]; annee: number }) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<(typeof FILTRES)[number]["id"]>("toutes");
  const visibles = useMemo(() => {
    const r = recherche.trim().toLowerCase();
    return entreprises.filter((e) =>
      (!r || [e.nom, e.ville, e.codeParrainage, e.cabinet].some((x) => (x ?? "").toLowerCase().includes(r))) &&
      (filtre === "toutes" || (filtre === "actives" && e.actif) || (filtre === "suspendues" && !e.actif) || (filtre === "paie" && e.formulePaie) ||
        (filtre === "rh" && e.formuleRH) || (filtre === "cabinet" && e.cabinet) || (filtre === "encours" && e.enCours.length > 0)));
  }, [entreprises, recherche, filtre]);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl shadow p-3 flex gap-3 flex-wrap items-center">
        <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="🔎 Nom, ville, code de parrainage, cabinet…" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" style={{ minWidth: 220 }} />
        <div className="flex gap-2 flex-wrap" role="tablist">
          {FILTRES.map((f) => (
            <button key={f.id} type="button" role="tab" aria-selected={filtre === f.id} onClick={() => setFiltre(f.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${filtre === f.id ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">Aucune entreprise ne correspond.</div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))" }}>
          {visibles.map((e) => (
            <article key={e.id} className={`bg-white rounded-xl shadow p-5 flex flex-col gap-4 ${e.actif ? "" : "opacity-70"}`} style={{ borderTop: `4px solid ${e.actif ? "#f97316" : "#eab308"}` }}>
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <Link href={`/admin/entreprises/${e.id}`} className="text-lg font-bold hover:text-orange-600 block truncate">{e.nom}</Link>
                  <p className="text-xs text-gray-500">{e.ville || "—"} · client depuis le {new Date(e.debutContrat).toLocaleDateString("fr-FR")}</p>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-semibold shrink-0" style={e.actif ? { backgroundColor: "#dcfce7", color: "#15803d" } : { backgroundColor: "#fef9c3", color: "#a16207" }}>
                  {e.actif ? "Active" : "⏸️ Suspendue"}
                </span>
              </div>

              <div className="flex gap-2 flex-wrap text-xs font-semibold">
                {e.cabinet && <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full">🏛️ {e.cabinet}</span>}
                {e.formuleRH && <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full">RH {e.formuleRH}</span>}
                {e.formulePaie && <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Paie {e.formulePaie}</span>}
                {!e.cabinet && !e.formuleRH && !e.formulePaie && <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Sans formule</span>}
                {e.remisePct ? <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full">Remise {e.remisePct} %</span> : null}
                {e.codeParrainage && <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full">🎟️ {e.codeParrainage}</span>}
              </div>

              <div className="grid grid-cols-5 gap-2 text-center">
                {[
                  { n: e.salaries, l: "salariés" }, { n: e.comptes, l: "comptes" }, { n: e.tickets, l: "tickets", a: e.tickets > 0 },
                  { n: e.absences, l: "absences", a: e.absences > 0 }, { n: e.demandesSalaries, l: "demandes", a: e.demandesSalaries > 0 },
                ].map((s) => (
                  <div key={s.l} className="rounded-lg py-2" style={{ background: s.a ? "#fff7ed" : "#f9fafb" }}>
                    <p className="text-lg font-bold" style={{ color: s.a ? "#ea580c" : "#111827" }}>{s.n}</p>
                    <p className="text-[11px] text-gray-500">{s.l}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-gray-100 p-3 text-sm grid grid-cols-3 gap-2">
                <div><p className="text-xs text-gray-500">Facturé {annee}</p><p className="font-bold">{eur(e.caAnnee)}</p></div>
                <div><p className="text-xs text-gray-500">Depuis le début</p><p className="font-bold">{eur(e.caTotal)}</p></div>
                <div><p className="text-xs text-gray-500">En attente</p><p className="font-bold" style={{ color: e.impaye > 0 ? "#dc2626" : "#111827" }}>{eur(e.impaye)}</p></div>
                {e.dernierMois && <p className="col-span-3 text-xs text-gray-400">Dernière facture : {e.dernierMois}</p>}
              </div>

              {e.enCours.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {e.enCours.map((c) => <Link key={c.label} href={c.href} className="text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 px-2 py-1 rounded-full hover:bg-orange-100">⏳ {c.label}</Link>)}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mt-auto text-sm font-semibold">
                <Link href={`/admin/entreprises/${e.id}`} className="bg-black text-white text-center rounded-lg py-2 hover:bg-gray-800">Ouvrir la fiche</Link>
                <Link href={`/admin/salaries?entreprise=${e.id}`} className="bg-orange-500 text-white text-center rounded-lg py-2 hover:bg-orange-600">👥 Salariés</Link>
                <Link href={`/admin/entreprises/${e.id}/modifier`} className="border border-gray-300 text-center rounded-lg py-2 hover:bg-gray-50">✏️ Modifier</Link>
                <Link href={`/admin/entreprises/${e.id}/permissions`} className="border border-gray-300 text-center rounded-lg py-2 hover:bg-gray-50">🔐 Accès & droits</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
