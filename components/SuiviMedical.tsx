"use client";

// Option Suivi médical complet : type de suivi et dernière visite de chaque salarié, prochaine visite calculée,
// visites de reprise et de mi-carrière à organiser.

import { useCallback, useEffect, useMemo, useState } from "react";
import { TYPES_SUIVI } from "@/lib/suivi-medical";

type Visite = { type: string; libelle: string; date: string; statut: "retard" | "bientot" | "ok" | "inconnu"; detail?: string };
type Ligne = { id: string; prenom: string; nom: string; poste: string; dateDebut: string | null; suiviMedical: string; derniereVisite: string | null; prochaine: Visite | null; alertes: Visite[] };

const COULEURS = {
  retard: { fond: "#fee2e2", texte: "#b91c1c", label: "En retard" },
  bientot: { fond: "#ffedd5", texte: "#c2410c", label: "Dans les 30 jours" },
  ok: { fond: "#dcfce7", texte: "#15803d", label: "À jour" },
  inconnu: { fond: "#f3f4f6", texte: "#6b7280", label: "À compléter" },
};
const fr = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

function Pastille({ v }: { v: Visite | null }) {
  const c = COULEURS[v?.statut ?? "inconnu"];
  return <span className="inline-block rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap" style={{ background: c.fond, color: c.texte }}>{v ? fr(v.date) : c.label}</span>;
}

export default function SuiviMedical() {
  const [liste, setListe] = useState<Ligne[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<"tous" | "afaire">("afaire");
  const [recherche, setRecherche] = useState("");
  const [enCours, setEnCours] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const r = await fetch("/api/suivi-medical");
    const j = await r.json().catch(() => ({}));
    if (r.ok) setListe(j); else setErreur(j.erreur || "Chargement impossible");
  }, []);
  useEffect(() => { charger(); }, [charger]);

  async function enregistrer(id: string, corps: Record<string, unknown>) {
    setEnCours(id);
    const r = await fetch("/api/suivi-medical", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ salarieId: id, ...corps }) });
    if (!r.ok) setErreur((await r.json().catch(() => ({}))).erreur || "Erreur"); else setErreur(null);
    await charger();
    setEnCours(null);
  }

  const urgence = (l: Ligne) => [l.prochaine, ...l.alertes].filter(Boolean).some((v) => v!.statut === "retard" || v!.statut === "bientot") || !l.derniereVisite;
  const compte = useMemo(() => {
    const l = liste ?? [];
    const toutes = l.flatMap((x) => [x.prochaine, ...x.alertes].filter(Boolean) as Visite[]);
    return { retard: toutes.filter((v) => v.statut === "retard").length, bientot: toutes.filter((v) => v.statut === "bientot").length, sansVisite: l.filter((x) => !x.derniereVisite).length, total: l.length };
  }, [liste]);
  const visibles = (liste ?? []).filter((l) => (filtre === "tous" || urgence(l)) && (!recherche.trim() || `${l.prenom} ${l.nom} ${l.poste}`.toLowerCase().includes(recherche.trim().toLowerCase())));

  if (!liste && !erreur) return <div className="bg-white rounded-xl shadow p-6 text-gray-500">Chargement…</div>;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["En retard", compte.retard, "#b91c1c"], ["Dans les 30 jours", compte.bientot, "#c2410c"], ["Sans visite connue", compte.sansVisite, "#6b7280"], ["Salariés suivis", compte.total, "#111827"]].map(([l, n, c]) => (
          <div key={String(l)} className="bg-white rounded-xl shadow p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{l}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: String(c) }}>{n}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-2 items-center">
        {([["afaire", "À organiser"], ["tous", "Tous les salariés"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setFiltre(k)} className={`px-4 py-2 rounded-lg font-semibold text-sm ${filtre === k ? "bg-orange-500 text-white" : "bg-gray-100"}`}>{l}</button>
        ))}
        <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="🔍 Salarié ou poste" className="border rounded-lg px-3 py-2 flex-1 min-w-[160px]" />
      </div>
      {erreur && <p className="text-sm text-red-700">{erreur}</p>}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="p-3">Salarié</th><th className="p-3">Type de suivi</th><th className="p-3">Dernière visite</th><th className="p-3">Prochaine visite</th><th className="p-3">À prévoir aussi</th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">{filtre === "afaire" ? "Rien à organiser pour le moment. 👍" : "Aucun salarié."}</td></tr>}
            {visibles.map((l) => (
              <tr key={l.id} className="border-t align-top" style={{ opacity: enCours === l.id ? 0.5 : 1 }}>
                <td className="p-3"><p className="font-semibold">{l.prenom} {l.nom}</p><p className="text-xs text-gray-500">{l.poste}{l.dateDebut ? ` · entré(e) le ${fr(l.dateDebut)}` : ""}</p></td>
                <td className="p-3">
                  <select value={l.suiviMedical} onChange={(e) => enregistrer(l.id, { suiviMedical: e.target.value })} className="border rounded-lg px-2 py-1" title={TYPES_SUIVI[l.suiviMedical]?.aide}>
                    {Object.entries(TYPES_SUIVI).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <input key={`${l.id}-${l.derniereVisite ?? ""}`} type="date" defaultValue={l.derniereVisite ? l.derniereVisite.slice(0, 10) : ""} max={new Date().toISOString().slice(0, 10)}
                    onBlur={(e) => { const v = e.target.value; if (v !== (l.derniereVisite?.slice(0, 10) ?? "")) enregistrer(l.id, { derniereVisite: v || null }); }}
                    className="border rounded-lg px-2 py-1" aria-label={`Dernière visite de ${l.prenom} ${l.nom}`} />
                  <button type="button" onClick={() => enregistrer(l.id, { derniereVisite: new Date().toISOString().slice(0, 10) })} className="block text-xs text-orange-700 font-semibold mt-1">✅ Visite faite aujourd&apos;hui</button>
                </td>
                <td className="p-3">
                  {l.prochaine ? <><Pastille v={l.prochaine} /><p className="text-xs text-gray-600 mt-1">{l.prochaine.libelle}</p>{l.prochaine.detail && <p className="text-xs text-gray-400">{l.prochaine.detail}</p>}</> : <span className="text-xs text-gray-400">Date d&apos;entrée manquante</span>}
                </td>
                <td className="p-3">
                  {l.alertes.length === 0 ? <span className="text-xs text-gray-400">—</span> : l.alertes.map((v, i) => (
                    <div key={i} className="mb-2"><Pastille v={v} /><p className="text-xs font-semibold mt-1">{v.libelle}</p>{v.detail && <p className="text-xs text-gray-500">{v.detail}</p>}</div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">La prochaine visite est ajoutée à vos échéances (et à celles de FRANEO RH si votre paie est gérée par nous). Le type de suivi dépend du poste : demandez à votre service de santé au travail en cas de doute. Le coût des visites facturé par le service de santé au travail reste à votre charge.</p>
    </>
  );
}
