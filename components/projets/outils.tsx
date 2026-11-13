"use client";

import { useState } from "react";
import { COULEURS_PROJET, MODELES_METIER, MODES_VENTE, STATUTS_PROJET } from "@/lib/projets-constantes";

export const eur = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }));
export const pct = (n: number | null | undefined) => (n == null ? "—" : `${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`);
export const h = (n: number | null | undefined) => (n == null ? "—" : `${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h`);
export const dateFR = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("fr-FR", { timeZone: "UTC" }) : "—");
export const iso = (d: string | null | undefined) => (d ? d.slice(0, 10) : "");
export const couleurMarge = (t: number | null | undefined) => (t == null ? "#6b7280" : t < 0 ? "#b91c1c" : t < 15 ? "#c2410c" : "#15803d");

/** Bandeau « en cours de développement » affiché sur toutes les pages de l'option */
export function BandeauDev() {
  return (
    <div className="rounded-xl p-4 text-sm" style={{ background: "#fff7ed", border: "1px solid #fdba74", color: "#9a3412" }}>
      🚧 <strong>Option Projets, planning & rentabilité (29 € HT/mois) : en cours de développement.</strong> Les calculs sont des estimations de pilotage (coût horaire chargé = salaire × charges, ou coût standard). Vos retours nous aident à finaliser le module : écrivez-nous depuis le Helpdesk.
    </div>
  );
}

export function PastilleStatut({ statut }: { statut: string }) {
  const s = STATUTS_PROJET[statut as keyof typeof STATUTS_PROJET];
  return <span className="text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap" style={{ background: `${s?.couleur ?? "#6b7280"}1a`, color: s?.couleur ?? "#6b7280" }}>{s?.label ?? statut}</span>;
}

/** Barre de progression (rouge au-delà de 100 %) */
export function Jauge({ valeur, seuil = 80, libelle }: { valeur: number | null; seuil?: number; libelle?: string }) {
  if (valeur == null) return <span className="text-xs text-gray-400">—</span>;
  const c = valeur >= 100 ? "#dc2626" : valeur >= seuil ? "#f59e0b" : "#16a34a";
  return (
    <div title={libelle} style={{ minWidth: "90px" }}>
      <div style={{ height: "8px", background: "#e5e7eb", borderRadius: "99px", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, valeur)}%`, height: "100%", background: c }} />
      </div>
      <span className="text-xs" style={{ color: c, fontWeight: 600 }}>{valeur} %</span>
    </div>
  );
}

export function Tuile({ titre, valeur, detail, couleur }: { titre: string; valeur: string; detail?: string; couleur?: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{titre}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: couleur }}>{valeur}</p>
      {detail && <p className="text-xs text-gray-500 mt-1">{detail}</p>}
    </div>
  );
}

export type ValeursProjet = {
  nom: string; code: string; client: string; description: string; couleur: string; statut: string;
  dateDebut: string; dateFin: string; modeVente: string; prixVente: string; tauxJournalier: string; joursVendus: string;
  budgetHeures: string; seuilAlerte: string; responsableId: string; montantMensuel: string; modele?: string;
};

export const projetVide = (): ValeursProjet => ({
  nom: "", code: "", client: "", description: "", couleur: COULEURS_PROJET[0], statut: "PREVU",
  dateDebut: new Date().toISOString().slice(0, 10), dateFin: "", modeVente: "FORFAIT", prixVente: "", tauxJournalier: "", joursVendus: "",
  budgetHeures: "", seuilAlerte: "80", responsableId: "", montantMensuel: "", modele: "LIBRE",
});

/** Formulaire de création / modification d'un projet */
export function FormulaireProjet({ initial, salaries, voitCouts, onEnvoyer, onAnnuler, libelle, avecModele = false }: {
  initial: ValeursProjet; salaries: { id: string; prenom: string; nom: string }[]; voitCouts: boolean; avecModele?: boolean;
  onEnvoyer: (v: ValeursProjet) => Promise<string | null>; onAnnuler?: () => void; libelle: string;
}) {
  const [v, setV] = useState(initial);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const champ = (k: keyof ValeursProjet) => ({ value: v[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value }) });
  const input = "border rounded-lg px-3 py-2 w-full";
  const vendu = v.modeVente === "REGIE" ? (Number(v.tauxJournalier) || 0) * (Number(v.joursVendus) || 0) : null;

  return (
    <form className="grid grid-cols-1 md:grid-cols-3 gap-3" onSubmit={async (e) => { e.preventDefault(); setEnvoi(true); setErreur(await onEnvoyer(v)); setEnvoi(false); }}>
      {avecModele && (
        <label className="text-sm font-semibold md:col-span-3">Métier (préremplit les étapes clés et le mode de vente)
          <select className={input} value={v.modele ?? "LIBRE"} onChange={(e) => { const m = MODELES_METIER[e.target.value]; setV({ ...v, modele: e.target.value, modeVente: m?.modeVente ?? v.modeVente, seuilAlerte: String(m?.seuilAlerte ?? 80) }); }}>
            {Object.entries(MODELES_METIER).map(([k, m]) => <option key={k} value={k}>{m.icone} {m.label}</option>)}
          </select>
          <span className="block text-xs text-gray-500 font-normal mt-1">{MODELES_METIER[v.modele ?? "LIBRE"]?.conseil}</span>
        </label>
      )}
      <label className="text-sm font-semibold md:col-span-2">Nom du projet *<input className={input} required {...champ("nom")} placeholder="Ex. Refonte du site, Chantier Dupont…" /></label>
      <label className="text-sm font-semibold">Code<input className={input} {...champ("code")} placeholder="Ex. P-2026-014" /></label>
      <label className="text-sm font-semibold">Client<input className={input} {...champ("client")} placeholder="Nom du client" /></label>
      <label className="text-sm font-semibold">Responsable
        <select className={input} {...champ("responsableId")}>
          <option value="">—</option>
          {salaries.map((s) => <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold">Statut
        <select className={input} {...champ("statut")}>{Object.entries(STATUTS_PROJET).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select>
      </label>
      <label className="text-sm font-semibold">Début *<input type="date" className={input} required {...champ("dateDebut")} /></label>
      <label className="text-sm font-semibold">Fin prévue<input type="date" className={input} {...champ("dateFin")} /></label>
      <div className="text-sm font-semibold">Couleur
        <div className="flex gap-2 mt-2">{COULEURS_PROJET.map((c) => (
          <button key={c} type="button" aria-label={c} onClick={() => setV({ ...v, couleur: c })} style={{ width: 24, height: 24, borderRadius: 99, background: c, outline: v.couleur === c ? "3px solid #111827" : "none", outlineOffset: 2 }} />
        ))}</div>
      </div>
      {voitCouts && (
        <>
          <label className="text-sm font-semibold">Mode de vente
            <select className={input} {...champ("modeVente")}>{Object.entries(MODES_VENTE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </label>
          {v.modeVente === "FORFAIT" && <label className="text-sm font-semibold">Prix de vente HT (€)<input type="number" step="0.01" min="0" className={input} {...champ("prixVente")} /></label>}
          {v.modeVente === "REGIE" && (
            <>
              <label className="text-sm font-semibold">Taux journalier HT (€)<input type="number" step="0.01" min="0" className={input} {...champ("tauxJournalier")} /></label>
              <label className="text-sm font-semibold">Jours vendus<input type="number" step="0.5" min="0" className={input} {...champ("joursVendus")} />
                {vendu ? <span className="text-xs text-gray-500 font-normal">= {eur(vendu)} vendus</span> : null}
              </label>
            </>
          )}
          {v.modeVente === "RECURRENT" && <label className="text-sm font-semibold">Montant mensuel HT (€)<input type="number" step="0.01" min="0" className={input} {...champ("montantMensuel")} /><span className="text-xs text-gray-500 font-normal">sans date de fin : contrat sur 12 mois</span></label>}
          {v.modeVente === "INTERNE" && <p className="text-sm text-gray-500 self-end">Projet interne : on suit seulement son coût.</p>}
        </>
      )}
      <label className="text-sm font-semibold">Enveloppe d&apos;heures<input type="number" step="0.5" min="0" className={input} {...champ("budgetHeures")} placeholder="facultatif" /></label>
      {voitCouts && <label className="text-sm font-semibold">Alerte budget à (%)<input type="number" min="1" max="100" className={input} {...champ("seuilAlerte")} /></label>}
      <label className="text-sm font-semibold md:col-span-3">Description<textarea className={input} rows={2} {...champ("description")} /></label>
      {erreur && <p className="text-sm text-red-700 md:col-span-3">{erreur}</p>}
      <div className="md:col-span-3 flex gap-2">
        <button type="submit" disabled={envoi} className="bg-black text-white px-5 py-2 rounded-lg font-semibold disabled:opacity-50">{envoi ? "Enregistrement…" : libelle}</button>
        {onAnnuler && <button type="button" onClick={onAnnuler} className="border px-5 py-2 rounded-lg font-semibold">Annuler</button>}
      </div>
    </form>
  );
}
