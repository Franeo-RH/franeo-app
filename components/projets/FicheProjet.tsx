"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CATEGORIES_DEPENSE, MODES_VENTE } from "@/lib/projets-constantes";
import { couleurMarge, dateFR, eur, FormulaireProjet, h, iso, Jauge, PastilleStatut, pct, Tuile, type ValeursProjet } from "./outils";

type Sal = { id: string; prenom: string; nom: string; coutHoraire?: number | null };
type Ligne = { salarieId: string; salarie: string; coutHoraire: number | null; heuresPrevues: number; heuresReelles: number; coutPrevu: number; coutReel: number };
type Projet = {
  id: string; nom: string; code: string | null; client: string | null; description: string | null; couleur: string; statut: string;
  dateDebut: string; dateFin: string | null; modeVente: string; prixVente: number | null; tauxJournalier: number | null; joursVendus: number | null;
  budgetHeures: number | null; seuilAlerte: number; responsableId: string | null; responsable: { prenom: string; nom: string } | null;
  affectations: { id: string; salarieId: string; du: string; au: string; heuresSemaine: number; role: string | null; salarie: Sal }[];
  temps: { id: string; salarieId: string; jour: string; heures: number; commentaire: string | null; salarie: Sal }[];
  depenses: { id: string; libelle: string; categorie: string; montant: number; date: string; prevu: boolean }[];
  notesFrais: { id: string; montant: number; statut: string; motif: string; date: string; salarie: { prenom: string; nom: string } }[];
  jalons: { id: string; libelle: string; date: string; etat: string; montant: number | null; facturation: string; faitLe: string | null }[];
  montantMensuel: number | null; modele: string | null;
  devis: { id: string; numero: string; objet: string; statut: string; totalHT: number; supplementaire: boolean }[];
  synthese: {
    venduContrat: number; facture: number; paye: number; aFacturer: number; resteAFacturer: number; jalonsFaits: number; jalonsTotal: number; jalonsEnRetard: number;
    vendu: number; heuresPrevues: number; heuresReelles: number; heuresRestantes: number; budgetMO: number; budgetFrais: number; budgetTotal: number;
    margePrevue: number; tauxMargePrevue: number | null; coutMO: number; fraisReels: number; coutReel: number; margeReelle: number; tauxMargeReelle: number | null;
    consommation: number | null; avancementTemps: number | null; sourceBudget: string | null; projectionCout: number; projectionMarge: number; tauxProjection: number | null;
    alertes: { niveau: string; texte: string }[]; parSalarie: Ligne[];
  };
};
type Donnees = {
  projet: Projet; salaries: (Sal & { poste: string })[]; voitCouts: boolean; peutGerer: boolean;
  conflits: { affectationId: string; salarie: string; du: string; au: string; type: string; statut: string }[];
  fraisLibres: { id: string; date: string; montant: number; motif: string; salarie: { prenom: string; nom: string } }[];
};

const auj = () => new Date().toISOString().slice(0, 10);
const carte = "bg-white rounded-xl shadow p-6";
const input = "border rounded-lg px-3 py-2";
const COULEUR_ALERTE: Record<string, { fond: string; texte: string; icone: string }> = {
  danger: { fond: "#fef2f2", texte: "#b91c1c", icone: "🔴" },
  attention: { fond: "#fff7ed", texte: "#c2410c", icone: "🟠" },
  info: { fond: "#eff6ff", texte: "#1d4ed8", icone: "ℹ️" },
};

export default function FicheProjet({ id }: { id: string }) {
  const router = useRouter();
  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [edition, setEdition] = useState(false);
  const [aff, setAff] = useState({ salarieId: "", du: auj(), au: "", heuresSemaine: "", role: "" });
  const [tps, setTps] = useState({ salarieId: "", jour: auj(), heures: "", commentaire: "" });
  const [dep, setDep] = useState({ libelle: "", categorie: "AUTRE", montant: "", date: auj(), prevu: true });
  const [frais, setFrais] = useState("");
  const [jal, setJal] = useState({ libelle: "", date: auj(), montant: "", facturation: "AUCUNE" });

  const charger = useCallback(async () => {
    const r = await fetch(`/api/projets/${id}`);
    const j = await r.json().catch(() => ({}));
    if (r.ok) setD(j); else setErreur(j.erreur || "Projet introuvable");
  }, [id]);
  useEffect(() => { charger(); }, [charger]);

  async function appel(methode: string, corps?: object, query = "") {
    setMsg(null);
    const r = await fetch(`/api/projets/${id}${query}`, { method: methode, headers: { "Content-Type": "application/json" }, body: corps ? JSON.stringify(corps) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg(`❌ ${j.erreur || "Action impossible"}`); return null; }
    await charger();
    return j;
  }

  if (erreur) return <div className={carte}><p className="text-red-700">{erreur}</p><Link href="/client/projets" className="underline">← Retour aux projets</Link></div>;
  if (!d) return <div className={`${carte} text-gray-500`}>Chargement…</div>;
  const { projet: p, voitCouts, peutGerer } = d;
  const s = p.synthese;
  const initial: ValeursProjet = {
    nom: p.nom, code: p.code ?? "", client: p.client ?? "", description: p.description ?? "", couleur: p.couleur, statut: p.statut,
    dateDebut: iso(p.dateDebut), dateFin: iso(p.dateFin), modeVente: p.modeVente, prixVente: p.prixVente?.toString() ?? "", tauxJournalier: p.tauxJournalier?.toString() ?? "",
    joursVendus: p.joursVendus?.toString() ?? "", budgetHeures: p.budgetHeures?.toString() ?? "", seuilAlerte: String(p.seuilAlerte), responsableId: p.responsableId ?? "", montantMensuel: p.montantMensuel?.toString() ?? "",
  };
  const suppr = (quoi: string, cle: string, question: string) => { if (confirm(question)) appel("DELETE", undefined, `?quoi=${quoi}&cle=${cle}`); };

  return (
    <>
      <div className={carte}>
        <Link href="/client/projets" className="text-sm text-gray-500 underline">← Tous les projets</Link>
        <div className="flex flex-wrap items-start justify-between gap-3 mt-2">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3"><span style={{ width: 16, height: 16, borderRadius: 99, background: p.couleur }} />{p.nom}</h1>
            <p className="text-gray-500 mt-1">
              {[p.code, p.client, voitCouts ? MODES_VENTE[p.modeVente as keyof typeof MODES_VENTE] : null, `du ${dateFR(p.dateDebut)} au ${dateFR(p.dateFin)}`, p.responsable ? `Responsable : ${p.responsable.prenom} ${p.responsable.nom}` : null].filter(Boolean).join(" · ")}
            </p>
            {p.description && <p className="text-sm mt-2 whitespace-pre-line">{p.description}</p>}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <PastilleStatut statut={p.statut} />
            {peutGerer && p.statut === "PREVU" && <button type="button" onClick={() => appel("PATCH", { statut: "EN_COURS" })} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold">▶️ Démarrer</button>}
            {peutGerer && p.statut === "EN_COURS" && <button type="button" onClick={() => confirm("Marquer le projet comme terminé ?") && appel("PATCH", { statut: "TERMINE" })} className="bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-semibold">✅ Terminer</button>}
            {peutGerer && <button type="button" onClick={() => setEdition(!edition)} className="border px-3 py-2 rounded-lg text-sm font-semibold">✏️ Modifier</button>}
            {peutGerer && <button type="button" onClick={async () => { const j = await appel("POST", { action: "dupliquer" }); if (j?.id) router.push(`/client/projets/${j.id}`); }} className="border px-3 py-2 rounded-lg text-sm font-semibold">📄 Dupliquer</button>}
            {peutGerer && <button type="button" onClick={async () => { if (confirm("Supprimer définitivement ce projet, son planning, ses temps et ses frais ?")) { const r = await fetch(`/api/projets/${id}`, { method: "DELETE" }); if (r.ok) router.push("/client/projets"); } }} className="border border-red-300 text-red-700 px-3 py-2 rounded-lg text-sm font-semibold">🗑️</button>}
          </div>
        </div>
        {msg && <p className="mt-3 text-sm font-semibold text-red-700">{msg}</p>}
      </div>

      {edition && (
        <div className={carte}>
          <h2 className="text-xl font-bold mb-4">Modifier le projet</h2>
          <FormulaireProjet initial={initial} salaries={d.salaries} voitCouts={voitCouts} libelle="Enregistrer"
            onAnnuler={() => setEdition(false)}
            onEnvoyer={async (v) => { const r = await fetch(`/api/projets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) }); const j = await r.json().catch(() => ({})); if (!r.ok) return j.erreur || "Enregistrement impossible"; setEdition(false); charger(); return null; }} />
        </div>
      )}

      {s.alertes.length > 0 && (
        <div className="flex flex-col gap-2">
          {s.alertes.map((a, i) => { const c = COULEUR_ALERTE[a.niveau] ?? COULEUR_ALERTE.info; return <div key={i} className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: c.fond, color: c.texte }}>{c.icone} {a.texte}</div>; })}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tuile titre="Heures réelles" valeur={h(s.heuresReelles)} detail={`${h(s.heuresPrevues)} planifiées${p.budgetHeures ? ` · enveloppe ${h(p.budgetHeures)}` : ""}`} />
        <Tuile titre="Calendrier écoulé" valeur={s.avancementTemps == null ? "—" : `${s.avancementTemps} %`} detail={`${h(s.heuresRestantes)} encore planifiées`} />
        {voitCouts && <Tuile titre="Marge réelle à date" valeur={eur(s.margeReelle)} detail={pct(s.tauxMargeReelle)} couleur={couleurMarge(s.tauxMargeReelle)} />}
        {voitCouts && <Tuile titre="Marge projetée en fin" valeur={eur(s.projectionMarge)} detail={pct(s.tauxProjection)} couleur={couleurMarge(s.tauxProjection)} />}
      </div>

      {voitCouts && (
        <div className={`${carte} overflow-x-auto`}>
          <h2 className="text-xl font-bold mb-3">💶 Vendu / Budgété / Réel / Projection</h2>
          <table className="w-full text-sm">
            <thead className="text-left bg-gray-50"><tr><th className="p-2"></th><th className="p-2">Budgété</th><th className="p-2">Réel à date</th><th className="p-2">Projection fin</th></tr></thead>
            <tbody>
              <tr className="border-t"><td className="p-2 font-semibold">Vendu{p.modeVente === "RECURRENT" ? " (contrat / à date)" : ""}</td><td className="p-2">{eur(s.venduContrat)}</td><td className="p-2">{eur(s.vendu)}</td><td className="p-2">{eur(s.venduContrat)}</td></tr>
              <tr className="border-t"><td className="p-2 font-semibold">Main-d&apos;œuvre</td><td className="p-2">{eur(s.budgetMO)}</td><td className="p-2">{eur(s.coutMO)}</td><td className="p-2" rowSpan={2}>{eur(s.projectionCout)}</td></tr>
              <tr className="border-t"><td className="p-2 font-semibold">Frais</td><td className="p-2">{eur(s.budgetFrais)}</td><td className="p-2">{eur(s.fraisReels)}</td></tr>
              <tr className="border-t font-bold"><td className="p-2">Marge</td>
                <td className="p-2" style={{ color: couleurMarge(s.tauxMargePrevue) }}>{eur(s.margePrevue)} ({pct(s.tauxMargePrevue)})</td>
                <td className="p-2" style={{ color: couleurMarge(s.tauxMargeReelle) }}>{eur(s.margeReelle)} ({pct(s.tauxMargeReelle)})</td>
                <td className="p-2" style={{ color: couleurMarge(s.tauxProjection) }}>{eur(s.projectionMarge)} ({pct(s.tauxProjection)})</td></tr>
            </tbody>
          </table>
          <div className="mt-3 max-w-md">
            <p className="text-sm text-gray-500 mb-1">Budget consommé (coût réel ÷ budget){s.sourceBudget ? ` · budget issu ${s.sourceBudget === "devis" ? "du devis accepté" : s.sourceBudget === "enveloppe" ? "de l'enveloppe d'heures" : "du planning"}` : ""}</p>
            <Jauge valeur={s.consommation} seuil={p.seuilAlerte} />
            {s.consommation == null && <p className="text-xs text-gray-500 mt-1">Pas encore de budget de main-d&apos;œuvre : planifiez les salariés ou indiquez une enveloppe d&apos;heures.</p>}
          </div>
        </div>
      )}

      <div className={`${carte} overflow-x-auto`}>
        <h2 className="text-xl font-bold mb-3">👥 Par salarié</h2>
        {s.parSalarie.length === 0 ? <p className="text-gray-500 text-sm">Personne n&apos;est encore planifié ni n&apos;a pointé sur ce projet.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left bg-gray-50"><tr><th className="p-2">Salarié</th><th className="p-2">Prévu</th><th className="p-2">Réel</th><th className="p-2">Écart</th>{voitCouts && <><th className="p-2">Coût horaire</th><th className="p-2">Coût prévu</th><th className="p-2">Coût réel</th></>}</tr></thead>
            <tbody>
              {s.parSalarie.map((l) => (
                <tr key={l.salarieId} className="border-t">
                  <td className="p-2 font-semibold">{l.salarie}</td><td className="p-2">{h(l.heuresPrevues)}</td><td className="p-2">{h(l.heuresReelles)}</td>
                  <td className="p-2" style={{ color: l.heuresReelles > l.heuresPrevues ? "#b91c1c" : undefined }}>{h(Math.round((l.heuresReelles - l.heuresPrevues) * 10) / 10)}</td>
                  {voitCouts && <><td className="p-2">{l.coutHoraire == null ? <span className="text-orange-700">à renseigner</span> : `${l.coutHoraire.toLocaleString("fr-FR")} €/h`}</td><td className="p-2">{eur(l.coutPrevu)}</td><td className="p-2">{eur(l.coutReel)}</td></>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={carte}>
        <h2 className="text-xl font-bold mb-3">🗓️ Planning du projet</h2>
        {d.conflits.length > 0 && (
          <div className="rounded-lg px-4 py-3 mb-3 text-sm" style={{ background: "#fff7ed", color: "#c2410c" }}>
            ⚠️ Absences pendant le planning : {d.conflits.map((c) => `${c.salarie} (${c.type.toLowerCase().replace(/_/g, " ")} du ${dateFR(c.du)} au ${dateFR(c.au)}, ${c.statut.toLowerCase()})`).join(" · ")}
          </div>
        )}
        {p.affectations.length === 0 ? <p className="text-gray-500 text-sm mb-3">Aucune affectation.</p> : (
          <ul className="divide-y mb-3">
            {p.affectations.map((a) => (
              <li key={a.id} className="py-2 flex flex-wrap justify-between gap-2 text-sm">
                <span><strong>{a.salarie.prenom} {a.salarie.nom}</strong>{a.role ? ` · ${a.role}` : ""} — {a.heuresSemaine} h/semaine du {dateFR(a.du)} au {dateFR(a.au)} {d.conflits.some((c) => c.affectationId === a.id) && "⚠️"}</span>
                {peutGerer && <button type="button" onClick={() => suppr("affectation", a.id, "Retirer cette affectation ?")} className="text-red-700 text-xs underline">Retirer</button>}
              </li>
            ))}
          </ul>
        )}
        {peutGerer && (
          <form className="flex flex-wrap gap-2 items-end" onSubmit={async (e) => { e.preventDefault(); if (await appel("POST", { action: "affectation", ...aff, au: aff.au || iso(p.dateFin) })) setAff({ ...aff, salarieId: "", heuresSemaine: "", role: "" }); }}>
            <select required value={aff.salarieId} onChange={(e) => setAff({ ...aff, salarieId: e.target.value })} className={input}>
              <option value="">Salarié…</option>{d.salaries.map((x) => <option key={x.id} value={x.id}>{x.prenom} {x.nom}</option>)}
            </select>
            <label className="text-xs">Du<input type="date" required value={aff.du} onChange={(e) => setAff({ ...aff, du: e.target.value })} className={`${input} block`} /></label>
            <label className="text-xs">Au<input type="date" required value={aff.au || iso(p.dateFin)} onChange={(e) => setAff({ ...aff, au: e.target.value })} className={`${input} block`} /></label>
            <input type="number" required min="0.5" max="60" step="0.5" placeholder="h / semaine" value={aff.heuresSemaine} onChange={(e) => setAff({ ...aff, heuresSemaine: e.target.value })} className={`${input} w-28`} />
            <input placeholder="Rôle (facultatif)" value={aff.role} onChange={(e) => setAff({ ...aff, role: e.target.value })} className={input} />
            <button type="submit" className="bg-black text-white px-4 py-2 rounded-lg font-semibold">➕ Planifier</button>
          </form>
        )}
        <p className="text-xs text-gray-500 mt-2">Vue d&apos;ensemble de la charge de chacun : <Link href="/client/projets/planning" className="underline">Planning</Link>.</p>
      </div>

      <div className={carte}>
        <div className="flex flex-wrap justify-between items-baseline gap-2 mb-3">
          <h2 className="text-xl font-bold">🏁 Étapes clés</h2>
          <span className="text-sm text-gray-500">{s.jalonsFaits} / {s.jalonsTotal} étape(s) faite(s)</span>
        </div>
        {p.jalons.length === 0 ? <p className="text-sm text-gray-500 mb-3">Aucune étape. Ajoutez les moments clés du projet (lancement, livraison, réception…).</p> : (
          <ul className="divide-y mb-3">
            {p.jalons.map((j) => {
              const retard = j.etat !== "FAIT" && new Date(j.date) < new Date(auj());
              return (
                <li key={j.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" disabled={!peutGerer} checked={j.etat === "FAIT"} onChange={(e) => appel("POST", { action: "jalonMaj", jalonId: j.id, etat: e.target.checked ? "FAIT" : "A_FAIRE" })} />
                    <span style={{ textDecoration: j.etat === "FAIT" ? "line-through" : undefined }}><strong>{j.libelle}</strong> · {dateFR(j.date)}</span>
                    {retard && <span className="text-xs font-semibold text-red-700">en retard</span>}
                  </label>
                  {peutGerer && <button type="button" onClick={() => suppr("jalon", j.id, "Supprimer cette étape ?")} className="text-red-700 text-xs underline">Supprimer</button>}
                </li>
              );
            })}
          </ul>
        )}
        {peutGerer && (
          <form className="flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); if (await appel("POST", { action: "jalon", libelle: jal.libelle, date: jal.date })) setJal({ ...jal, libelle: "" }); }}>
            <input required placeholder="Ex. Livraison phase 1, Réception du chantier" value={jal.libelle} onChange={(e) => setJal({ ...jal, libelle: e.target.value })} className={`${input} flex-1 min-w-[200px]`} />
            <input type="date" required value={jal.date} onChange={(e) => setJal({ ...jal, date: e.target.value })} className={input} />
            <button type="submit" className="bg-black text-white px-4 py-2 rounded-lg font-semibold">➕ Ajouter</button>
          </form>
        )}
      </div>

      <div className={carte}>
        <div className="flex justify-between items-baseline gap-2">
          <h2 className="text-xl font-bold mb-1">⏱️ Temps passé</h2>
          <a href={`/api/projets/${id}?format=csv`} className="text-sm font-semibold underline">📥 Exporter les temps (Excel)</a>
        </div>
        <p className="text-sm text-gray-500 mb-3">Les heures pointées avec ce projet depuis le badge sont comptées automatiquement. Ajoutez ici le temps qui n&apos;a pas été pointé.</p>
        {p.temps.length > 0 && (
          <ul className="divide-y mb-3 max-h-72 overflow-y-auto">
            {p.temps.map((t) => (
              <li key={t.id} className="py-2 flex justify-between gap-2 text-sm">
                <span>{dateFR(t.jour)} · <strong>{t.salarie.prenom} {t.salarie.nom}</strong> · {h(t.heures)}{t.commentaire ? ` — ${t.commentaire}` : ""}</span>
                {peutGerer && <button type="button" onClick={() => suppr("temps", t.id, "Supprimer ce temps ?")} className="text-red-700 text-xs underline">Supprimer</button>}
              </li>
            ))}
          </ul>
        )}
        {peutGerer && (
          <form className="flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); if (await appel("POST", { action: "temps", ...tps })) setTps({ ...tps, heures: "", commentaire: "" }); }}>
            <select required value={tps.salarieId} onChange={(e) => setTps({ ...tps, salarieId: e.target.value })} className={input}>
              <option value="">Salarié…</option>{d.salaries.map((x) => <option key={x.id} value={x.id}>{x.prenom} {x.nom}</option>)}
            </select>
            <input type="date" required value={tps.jour} onChange={(e) => setTps({ ...tps, jour: e.target.value })} className={input} />
            <input type="number" required min="0.25" max="24" step="0.25" placeholder="Heures" value={tps.heures} onChange={(e) => setTps({ ...tps, heures: e.target.value })} className={`${input} w-24`} />
            <input placeholder="Commentaire" value={tps.commentaire} onChange={(e) => setTps({ ...tps, commentaire: e.target.value })} className={`${input} flex-1 min-w-[160px]`} />
            <button type="submit" className="bg-black text-white px-4 py-2 rounded-lg font-semibold">➕ Ajouter</button>
          </form>
        )}
      </div>

      {voitCouts && (
        <div className={carte}>
          <h2 className="text-xl font-bold mb-3">🧾 Frais du projet</h2>
          {p.depenses.length > 0 && (
            <table className="w-full text-sm mb-3">
              <thead className="text-left bg-gray-50"><tr><th className="p-2">Date</th><th className="p-2">Libellé</th><th className="p-2">Catégorie</th><th className="p-2">Type</th><th className="p-2 text-right">Montant</th><th /></tr></thead>
              <tbody>
                {p.depenses.map((x) => (
                  <tr key={x.id} className="border-t">
                    <td className="p-2">{dateFR(x.date)}</td><td className="p-2">{x.libelle}</td><td className="p-2">{CATEGORIES_DEPENSE[x.categorie as keyof typeof CATEGORIES_DEPENSE] ?? x.categorie}</td>
                    <td className="p-2">{x.prevu ? "Prévu (budget)" : "Réel"}</td><td className="p-2 text-right">{eur(x.montant)}</td>
                    <td className="p-2 text-right">{peutGerer && <button type="button" onClick={() => suppr("depense", x.id, "Supprimer ce frais ?")} className="text-red-700 text-xs underline">Supprimer</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {peutGerer && (
            <form className="flex flex-wrap gap-2 mb-4" onSubmit={async (e) => { e.preventDefault(); if (await appel("POST", { action: "depense", ...dep })) setDep({ ...dep, libelle: "", montant: "" }); }}>
              <input required placeholder="Libellé" value={dep.libelle} onChange={(e) => setDep({ ...dep, libelle: e.target.value })} className={`${input} flex-1 min-w-[160px]`} />
              <select value={dep.categorie} onChange={(e) => setDep({ ...dep, categorie: e.target.value })} className={input}>{Object.entries(CATEGORIES_DEPENSE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              <input type="number" required min="0.01" step="0.01" placeholder="Montant €" value={dep.montant} onChange={(e) => setDep({ ...dep, montant: e.target.value })} className={`${input} w-28`} />
              <input type="date" required value={dep.date} onChange={(e) => setDep({ ...dep, date: e.target.value })} className={input} />
              <select value={dep.prevu ? "1" : "0"} onChange={(e) => setDep({ ...dep, prevu: e.target.value === "1" })} className={input}><option value="1">Prévu (budget)</option><option value="0">Réel (dépensé)</option></select>
              <button type="submit" className="bg-black text-white px-4 py-2 rounded-lg font-semibold">➕ Ajouter</button>
            </form>
          )}
          <h3 className="font-bold mb-2">Notes de frais des salariés imputées au projet</h3>
          {p.notesFrais.length === 0 ? <p className="text-sm text-gray-500 mb-2">Aucune.</p> : (
            <ul className="divide-y mb-2">
              {p.notesFrais.map((n) => (
                <li key={n.id} className="py-2 flex justify-between text-sm gap-2">
                  <span>{dateFR(n.date)} · {n.salarie.prenom} {n.salarie.nom} · {n.motif} · <strong>{eur(n.montant)}</strong> ({n.statut}{/valid/i.test(n.statut) ? "" : " : comptée une fois validée"})</span>
                  {peutGerer && <button type="button" onClick={() => suppr("frais", n.id, "Détacher cette note de frais du projet ?")} className="text-red-700 text-xs underline">Détacher</button>}
                </li>
              ))}
            </ul>
          )}
          {peutGerer && d.fraisLibres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <select value={frais} onChange={(e) => setFrais(e.target.value)} className={`${input} flex-1 min-w-[220px]`}>
                <option value="">Imputer une note de frais…</option>
                {d.fraisLibres.map((n) => <option key={n.id} value={n.id}>{dateFR(n.date)} · {n.salarie.prenom} {n.salarie.nom} · {n.motif} · {eur(n.montant)}</option>)}
              </select>
              <button type="button" disabled={!frais} onClick={async () => { if (await appel("POST", { action: "rattacherFrais", noteFraisId: frais })) setFrais(""); }} className="border px-4 py-2 rounded-lg font-semibold disabled:opacity-50">Imputer</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
