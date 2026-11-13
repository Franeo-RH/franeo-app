"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { STATUTS_PROJET } from "@/lib/projets-constantes";
import { couleurMarge, dateFR, eur, FormulaireProjet, h, Jauge, PastilleStatut, pct, projetVide, Tuile, type ValeursProjet } from "./outils";

type Alerte = { niveau: "info" | "attention" | "danger"; texte: string };
type Projet = {
  id: string; nom: string; code: string | null; client: string | null; couleur: string; statut: string; dateDebut: string; dateFin: string | null; seuilAlerte: number;
  responsable: { prenom: string; nom: string } | null;
  synthese: { vendu: number; budgetTotal: number; coutReel: number; margeReelle: number; tauxMargeReelle: number | null; heuresPrevues: number; heuresReelles: number; consommation: number | null; avancementTemps: number | null; projectionMarge: number; tauxProjection: number | null; alertes: Alerte[] };
};

export default function ListeProjets() {
  const router = useRouter();
  const [donnees, setDonnees] = useState<{ projets: Projet[]; voitCouts: boolean; peutGerer: boolean } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState("ACTIFS");
  const [recherche, setRecherche] = useState("");
  const [creation, setCreation] = useState(false);
  const [salaries, setSalaries] = useState<{ id: string; prenom: string; nom: string }[]>([]);

  const charger = useCallback(async () => {
    const r = await fetch("/api/projets");
    const d = await r.json().catch(() => ({}));
    if (r.ok) setDonnees(d); else setErreur(d.erreur || "Chargement impossible");
  }, []);
  useEffect(() => { charger(); }, [charger]);
  useEffect(() => {
    if (creation && !salaries.length) fetch("/api/projets/planning?semaines=1").then((r) => r.json()).then((d) => setSalaries((d.lignes || []).map((l: { salarieId: string; salarie: string }) => { const [prenom, ...nom] = l.salarie.split(" "); return { id: l.salarieId, prenom, nom: nom.join(" ") }; }))).catch(() => {});
  }, [creation, salaries.length]);

  const vues = useMemo(() => {
    const f = recherche.trim().toLowerCase();
    return (donnees?.projets || [])
      .filter((p) => filtre === "TOUS" || (filtre === "ACTIFS" ? p.statut === "PREVU" || p.statut === "EN_COURS" : p.statut === filtre))
      .filter((p) => !f || `${p.nom} ${p.code ?? ""} ${p.client ?? ""}`.toLowerCase().includes(f));
  }, [donnees, filtre, recherche]);

  if (erreur) return <div className="bg-white rounded-xl shadow p-6 text-red-700">{erreur}</div>;
  if (!donnees) return <div className="bg-white rounded-xl shadow p-6 text-gray-500">Chargement…</div>;
  const { voitCouts, peutGerer } = donnees;
  const actifs = donnees.projets.filter((p) => p.statut === "EN_COURS");
  const enAlerte = donnees.projets.filter((p) => p.statut !== "TERMINE" && p.statut !== "ANNULE" && p.synthese.alertes.some((a) => a.niveau !== "info"));
  const somme = (f: (p: Projet) => number) => actifs.reduce((t, p) => t + f(p), 0);
  const venduActifs = somme((p) => p.synthese.vendu);
  const margeProjetee = somme((p) => p.synthese.projectionMarge);

  async function creer(v: ValeursProjet) {
    const r = await fetch("/api/projets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return d.erreur || "Création impossible";
    router.push(`/client/projets/${d.id}`);
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tuile titre="Projets en cours" valeur={String(actifs.length)} detail={`${donnees.projets.filter((p) => p.statut === "PREVU").length} prévu(s)`} />
        <Tuile titre="Heures pointées (en cours)" valeur={h(somme((p) => p.synthese.heuresReelles))} detail={`sur ${h(somme((p) => p.synthese.heuresPrevues))} planifiées`} />
        {voitCouts && <Tuile titre="Vendu (en cours)" valeur={eur(venduActifs)} />}
        {voitCouts && <Tuile titre="Marge projetée (en cours)" valeur={eur(margeProjetee)} detail={venduActifs > 0 ? pct(Math.round((margeProjetee / venduActifs) * 1000) / 10) : undefined} couleur={margeProjetee < 0 ? "#b91c1c" : "#15803d"} />}
      </div>

      {enAlerte.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4">
          <p className="font-bold mb-2">⚠️ {enAlerte.length} projet(s) à surveiller</p>
          <ul className="text-sm space-y-1">
            {enAlerte.map((p) => (
              <li key={p.id}><Link href={`/client/projets/${p.id}`} className="font-semibold underline">{p.nom}</Link> : {p.synthese.alertes.filter((a) => a.niveau !== "info").map((a) => a.texte).join(" · ")}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-center">
        <select value={filtre} onChange={(e) => setFiltre(e.target.value)} className="border rounded-lg px-3 py-2">
          <option value="ACTIFS">Prévus et en cours</option>
          <option value="TOUS">Tous les projets</option>
          {Object.entries(STATUTS_PROJET).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
        <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un projet, un code, un client" className="border rounded-lg px-3 py-2 flex-1 min-w-[200px]" />
        <a href="/api/projets?format=csv" className="border rounded-lg px-4 py-2 font-semibold">📥 Export Excel</a>
        {peutGerer && <button type="button" onClick={() => setCreation(!creation)} className="bg-black text-white rounded-lg px-4 py-2 font-semibold">{creation ? "Fermer" : "➕ Nouveau projet"}</button>}
      </div>

      {creation && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Nouveau projet</h2>
          <FormulaireProjet avecModele initial={projetVide()} salaries={salaries} voitCouts={voitCouts} onEnvoyer={creer} onAnnuler={() => setCreation(false)} libelle="Créer le projet" />
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Projet</th><th className="p-3">Statut</th><th className="p-3">Dates</th><th className="p-3">Heures (réel / prévu)</th>
              {voitCouts && <><th className="p-3">Vendu</th><th className="p-3">Coût réel</th><th className="p-3">Budget consommé</th><th className="p-3">Marge réelle</th><th className="p-3">Marge projetée</th></>}
            </tr>
          </thead>
          <tbody>
            {vues.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-gray-500">Aucun projet{peutGerer ? " : créez le premier avec « Nouveau projet »." : "."}</td></tr>}
            {vues.map((p) => {
              const s = p.synthese;
              const alerte = s.alertes.find((a) => a.niveau === "danger") ?? s.alertes.find((a) => a.niveau === "attention");
              return (
                <tr key={p.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/client/projets/${p.id}`)}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span style={{ width: 10, height: 10, borderRadius: 99, background: p.couleur, flexShrink: 0 }} />
                      <div>
                        <p className="font-semibold">{p.nom} {alerte && <span title={alerte.texte}>{alerte.niveau === "danger" ? "🔴" : "🟠"}</span>}</p>
                        <p className="text-xs text-gray-500">{[p.code, p.client, p.responsable ? `Resp. ${p.responsable.prenom} ${p.responsable.nom}` : null].filter(Boolean).join(" · ")}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3"><PastilleStatut statut={p.statut} /></td>
                  <td className="p-3 whitespace-nowrap">{dateFR(p.dateDebut)} → {dateFR(p.dateFin)}</td>
                  <td className="p-3 whitespace-nowrap">{h(s.heuresReelles)} / {h(s.heuresPrevues)}</td>
                  {voitCouts && (
                    <>
                      <td className="p-3 whitespace-nowrap">{eur(s.vendu)}</td>
                      <td className="p-3 whitespace-nowrap">{eur(s.coutReel)}</td>
                      <td className="p-3"><Jauge valeur={s.consommation} seuil={p.seuilAlerte} libelle={s.avancementTemps != null ? `${s.avancementTemps} % du calendrier écoulé` : undefined} /></td>
                      <td className="p-3 whitespace-nowrap font-semibold" style={{ color: couleurMarge(s.tauxMargeReelle) }}>{eur(s.margeReelle)} <span className="text-xs">({pct(s.tauxMargeReelle)})</span></td>
                      <td className="p-3 whitespace-nowrap font-semibold" style={{ color: couleurMarge(s.tauxProjection) }}>{pct(s.tauxProjection)}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
