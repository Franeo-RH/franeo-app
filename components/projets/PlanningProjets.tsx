"use client";

// Planning du mois : une ligne par salarié, une colonne par jour.
// Chaque projet est une barre de couleur sur les jours où la personne y est planifiée,
// les absences sont une barre grise hachurée, et la charge du mois est une jauge à droite.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { h } from "./outils";
import ConflitsAbsences, { type Conflit } from "./ConflitsAbsences";

type Jour = { date: string; weekend: boolean; ferie: boolean };
type Projet = { id: string; nom: string; code: string | null; couleur: string };
type Absence = { type: string; enAttente: boolean } | null;
type Ligne = {
  salarieId: string; salarie: string; poste: string; service: string | null; capaciteSemaine: number;
  projets: { projetId: string; heures: number[] }[]; absence: Absence[];
  capacite: number; planifie: number; charge: number; conflits: number;
};
type Donnees = { mois: string; jours: Jour[]; projets: Projet[]; lignes: Ligne[]; conflits: Conflit[]; peutGerer: boolean };
type Segment = { de: number; a: number; heuresJour: number; jours: number };

const LARGEUR_NOM = 200;
const LARGEUR_CHARGE = 130;
const LARGEUR_JOUR = 30;
const INITIALES = ["D", "L", "M", "M", "J", "V", "S"];

const moisCourant = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const decalerMois = (m: string, n: number) => { const [a, mo] = m.split("-").map(Number); const d = new Date(a, mo - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const titreMois = (m: string) => { const [a, mo] = m.split("-").map(Number); const t = new Date(a, mo - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }); return t.charAt(0).toUpperCase() + t.slice(1); };
const aujourdhui = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const libelleAbsence = (t: string) => { const x = t.toLowerCase().replace(/_/g, " ").replace("conge", "congé").replace("paye", "payé"); return x.charAt(0).toUpperCase() + x.slice(1); };
const ouvre = (j: Jour) => !j.weekend && !j.ferie;

/** Jours consécutifs (les week-ends et fériés ne coupent pas la barre) */
function segments<T>(jours: Jour[], valeurs: T[], actif: (v: T) => boolean, memeGroupe: (a: T, b: T) => boolean = () => true): (Segment & { valeur: T })[] {
  const res: (Segment & { valeur: T })[] = [];
  let cours: (Segment & { valeur: T; total: number }) | null = null;
  const fermer = () => { if (cours) { res.push({ de: cours.de, a: cours.a, jours: cours.jours, heuresJour: cours.jours ? cours.total / cours.jours : 0, valeur: cours.valeur }); cours = null; } };
  jours.forEach((j, i) => {
    if (!ouvre(j)) return; // un jour non travaillé ne ferme pas la barre
    const v = valeurs[i];
    if (actif(v)) {
      if (cours && memeGroupe(cours.valeur, v)) { cours.a = i; cours.jours++; cours.total += typeof v === "number" ? v : 0; }
      else { fermer(); cours = { de: i, a: i, jours: 1, heuresJour: 0, total: typeof v === "number" ? v : 0, valeur: v }; }
    } else fermer();
  });
  fermer();
  return res;
}

const couleurCharge = (c: number) => (c > 100 ? "#dc2626" : c >= 85 ? "#16a34a" : c >= 50 ? "#eab308" : "#9ca3af");
const texteCharge = (c: number) => (c > 100 ? "Surchargé" : c >= 85 ? "Bien chargé" : c >= 50 ? "Disponible en partie" : c > 0 ? "Peu chargé" : "Libre");

export default function PlanningProjets() {
  const [mois, setMois] = useState(moisCourant);
  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState("");
  const [seulementPlanifies, setSeulementPlanifies] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setD(null); setErreur(null);
    const r = await fetch(`/api/projets/planning?mois=${mois}`);
    const j = await r.json().catch(() => ({}));
    if (r.ok) setD(j); else setErreur(j.erreur || "Chargement impossible");
  }, [mois]);
  useEffect(() => { charger(); }, [charger]);

  const projets = useMemo(() => new Map((d?.projets || []).map((p) => [p.id, p])), [d]);
  const lignes = useMemo(() => {
    const f = filtre.trim().toLowerCase();
    return (d?.lignes || []).filter((l) =>
      (!f || `${l.salarie} ${l.poste} ${l.service ?? ""}`.toLowerCase().includes(f)) &&
      (!seulementPlanifies || l.projets.length > 0) &&
      (!focus || l.projets.some((p) => p.projetId === focus)));
  }, [d, filtre, seulementPlanifies, focus]);

  const totaux = useMemo(() => {
    const ls = d?.lignes || [];
    const planifie = ls.reduce((t, l) => t + l.planifie, 0);
    const capacite = ls.reduce((t, l) => t + l.capacite, 0);
    return { planifie, capacite, charge: capacite > 0 ? Math.round((planifie / capacite) * 100) : 0, surcharges: ls.filter((l) => l.charge > 100).length, libres: ls.filter((l) => l.planifie === 0).length };
  }, [d]);
  const heuresProjet = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of d?.lignes || []) for (const p of l.projets) m.set(p.projetId, (m.get(p.projetId) ?? 0) + p.heures.reduce((t, x) => t + x, 0));
    return m;
  }, [d]);

  if (erreur) return <div className="bg-white rounded-xl shadow p-6 text-red-700">{erreur}</div>;

  const nb = d?.jours.length ?? 30;
  const colonnes = `${LARGEUR_NOM}px repeat(${nb}, minmax(${LARGEUR_JOUR}px, 1fr)) ${LARGEUR_CHARGE}px`;
  const largeurMin = LARGEUR_NOM + nb * LARGEUR_JOUR + LARGEUR_CHARGE;
  const auj = aujourdhui();

  return (
    <>
      {/* Navigation du mois */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMois(decalerMois(mois, -1))} className="border rounded-lg w-10 h-10 font-bold" aria-label="Mois précédent">‹</button>
          <h2 className="text-xl font-bold text-center" style={{ minWidth: 190 }}>{titreMois(mois)}</h2>
          <button type="button" onClick={() => setMois(decalerMois(mois, 1))} className="border rounded-lg w-10 h-10 font-bold" aria-label="Mois suivant">›</button>
        </div>
        {mois !== moisCourant() && <button type="button" onClick={() => setMois(moisCourant())} className="border rounded-lg px-3 py-2 text-sm font-semibold">Ce mois-ci</button>}
        <input value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder="🔍 Salarié, poste, service" className="border rounded-lg px-3 py-2 flex-1 min-w-[160px]" />
        <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={seulementPlanifies} onChange={(e) => setSeulementPlanifies(e.target.checked)} /> Seulement les salariés planifiés</label>
      </div>

      {/* Chiffres du mois */}
      {d && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tuile titre="Heures planifiées" valeur={h(Math.round(totaux.planifie))} detail={`sur ${h(Math.round(totaux.capacite))} disponibles`} />
          <Tuile titre="Charge de l'équipe" valeur={`${totaux.charge} %`} detail={texteCharge(totaux.charge)} couleur={couleurCharge(totaux.charge)} />
          <Tuile titre="En surcharge" valeur={String(totaux.surcharges)} detail={totaux.surcharges ? "salarié(s) à plus de 100 %" : "personne"} couleur={totaux.surcharges ? "#dc2626" : undefined} />
          <Tuile titre="Sans projet ce mois" valeur={String(totaux.libres)} detail="salarié(s) disponibles" />
        </div>
      )}

      {d && <ConflitsAbsences conflits={d.conflits} salaries={d.lignes.map((l) => ({ id: l.salarieId, nom: l.salarie }))} peutGerer={d.peutGerer} onChange={charger} />}

      {/* Projets du mois : cliquer pour n'afficher que ce projet */}
      {d && d.projets.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-2 items-center">
          <span className="text-sm font-semibold text-gray-600 mr-1">Projets du mois :</span>
          {d.projets.map((p) => {
            const actif = focus === p.id;
            return (
              <button key={p.id} type="button" onClick={() => setFocus(actif ? null : p.id)}
                className="flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold border transition"
                style={{ borderColor: p.couleur, background: actif ? p.couleur : "transparent", color: actif ? "#ffffff" : undefined, opacity: focus && !actif ? 0.5 : 1 }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: actif ? "#ffffff" : p.couleur }} />
                {p.nom} <span className="font-normal">· {h(Math.round(heuresProjet.get(p.id) ?? 0))}</span>
              </button>
            );
          })}
          {focus && <button type="button" onClick={() => setFocus(null)} className="text-sm underline text-gray-600">Tout afficher</button>}
        </div>
      )}

      {/* Le calendrier */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        {!d ? <p className="p-6 text-gray-500">Chargement…</p> : (
          <div style={{ minWidth: largeurMin }}>
            {/* En-tête : jours du mois */}
            <div className="fr-plan-ligne fr-plan-entete" style={{ gridTemplateColumns: colonnes, gridTemplateRows: "48px" }}>
              <div className="fr-plan-nom fr-plan-nom-entete">Salarié</div>
              {d.jours.map((j, i) => {
                const n = new Date(`${j.date}T12:00:00`);
                return (
                  <div key={j.date} className={`fr-plan-jour-titre${ouvre(j) ? "" : " fr-plan-off"}${j.date === auj ? " fr-plan-auj" : ""}`} style={{ gridColumn: i + 2 }} title={j.ferie ? "Jour férié" : undefined}>
                    <span className="fr-plan-initiale">{INITIALES[n.getDay()]}</span>
                    <span className="fr-plan-num">{n.getDate()}</span>
                  </div>
                );
              })}
              <div className="fr-plan-charge-titre" style={{ gridColumn: nb + 2 }}>Charge du mois</div>
            </div>

            {lignes.length === 0 && <p className="p-6 text-center text-gray-500">Aucun salarié à afficher.</p>}
            {lignes.map((l) => {
              const absences = segments(d.jours, l.absence, (v) => !!v, (a, b) => a?.type === b?.type);
              const voies = l.projets.length + (absences.length ? 1 : 0);
              const nbVoies = Math.max(1, voies);
              return (
                <div key={l.salarieId} className="fr-plan-ligne" style={{ gridTemplateColumns: colonnes, gridTemplateRows: nbVoies === 1 ? "44px" : `repeat(${nbVoies}, 26px)` }}>
                  <div className="fr-plan-nom" style={{ gridRow: `1 / ${nbVoies + 1}` }}>
                    <p className="font-semibold truncate">{l.salarie}</p>
                    <p className="text-xs text-gray-500 truncate">{l.poste}{l.service ? ` · ${l.service}` : ""}</p>
                  </div>
                  {/* Fond : week-ends, fériés, aujourd'hui */}
                  {d.jours.map((j, i) => (
                    <div key={j.date} className={`fr-plan-case${ouvre(j) ? "" : " fr-plan-off"}${j.date === auj ? " fr-plan-auj" : ""}`} style={{ gridColumn: i + 2, gridRow: `1 / ${nbVoies + 1}` }} />
                  ))}
                  {/* Une barre par projet */}
                  {l.projets.map((p, voie) => {
                    const pr = projets.get(p.projetId);
                    if (!pr) return null;
                    return segments(d.jours, p.heures, (v) => v > 0).map((s) => (
                      <Link key={`${p.projetId}-${s.de}`} href={`/client/projets/${p.projetId}`}
                        className="fr-plan-barre"
                        style={{ gridColumn: `${s.de + 2} / ${s.a + 3}`, gridRow: voie + 1, background: pr.couleur, opacity: focus && focus !== p.projetId ? 0.2 : 1 }}
                        title={`${pr.nom} · ${h(Math.round(s.heuresJour * 10) / 10)}/jour · ${s.jours} jour(s)`}>
                        {s.a - s.de >= 2 ? `${pr.code || pr.nom} · ${h(Math.round(s.heuresJour * 10) / 10)}/j` : ""}
                      </Link>
                    ));
                  })}
                  {/* Les absences */}
                  {absences.map((s) => (
                    <div key={`abs-${s.de}`} className={`fr-plan-absence${s.valeur?.enAttente ? " fr-plan-attente" : ""}`}
                      style={{ gridColumn: `${s.de + 2} / ${s.a + 3}`, gridRow: l.projets.length + 1 }}
                      title={`${libelleAbsence(s.valeur?.type ?? "")}${s.valeur?.enAttente ? " (en attente)" : ""} · ${s.jours} jour(s)`}>
                      {s.a - s.de >= 2 ? `🏖️ ${libelleAbsence(s.valeur?.type ?? "")}` : "🏖️"}
                    </div>
                  ))}
                  {voies === 0 && <div className="fr-plan-vide" style={{ gridColumn: `2 / ${nb + 2}`, gridRow: 1 }}>Aucun projet ce mois</div>}
                  {/* Charge du mois */}
                  <div className="fr-plan-charge" style={{ gridColumn: nb + 2, gridRow: `1 / ${nbVoies + 1}` }} title={`${h(l.planifie)} planifiées sur ${h(l.capacite)} disponibles`}>
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="font-bold" style={{ color: couleurCharge(l.charge) }}>{l.charge > 900 ? "—" : `${l.charge} %`}</span>
                      <span className="text-xs text-gray-500">{Math.round(l.planifie)}/{Math.round(l.capacite)} h</span>
                    </div>
                    <div className="fr-plan-jauge"><span style={{ width: `${Math.min(100, l.charge)}%`, background: couleurCharge(l.charge) }} /></div>
                    {l.conflits > 0 && <p className="text-xs font-semibold" style={{ color: "#b45309" }}>⚠️ {l.conflits} j en absence</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-4 text-sm flex flex-wrap gap-4 items-center text-gray-600">
        <span className="flex items-center gap-2"><span className="fr-plan-legende fr-plan-absence" /> Absence</span>
        <span className="flex items-center gap-2"><span className="fr-plan-legende fr-plan-absence fr-plan-attente" /> Absence en attente</span>
        <span className="flex items-center gap-2"><span className="fr-plan-legende fr-plan-off" /> Week-end ou jour férié</span>
        <span className="flex items-center gap-2"><span className="fr-plan-legende" style={{ background: "#16a34a" }} /> Charge 85–100 %</span>
        <span className="flex items-center gap-2"><span className="fr-plan-legende" style={{ background: "#dc2626" }} /> Surcharge</span>
      </div>
      <p className="text-xs text-gray-500">Survolez une barre pour voir le détail, cliquez pour ouvrir le projet. Pour planifier quelqu&apos;un : ouvrez le projet › onglet Planning. La capacité tient compte des heures du contrat, des absences, des week-ends et des jours fériés.</p>
    </>
  );
}

function Tuile({ titre, valeur, detail, couleur }: { titre: string; valeur: string; detail: string; couleur?: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{titre}</p>
      <p className="text-2xl font-bold mt-1" style={couleur ? { color: couleur } : undefined}>{valeur}</p>
      <p className="text-xs text-gray-500">{detail}</p>
    </div>
  );
}
