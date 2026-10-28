"use client";

import { useCallback, useEffect, useState } from "react";
import CalendrierReleve from "@/components/CalendrierReleve";
import { fmtH, NOMS_MOIS, STATUTS_RELEVE, type AbsenceReleve, type JourReleve } from "@/lib/heures";
import { BoutonExportComplet, BoutonModifierAdmin, BoutonSupprimerAdmin } from "@/components/OutilsAdmin";

type Releve = {
  entreprise?: { nom: string } | null;
  id: string; mois: number; annee: number; premier: string; statut: string; motifRefus: string | null; envoyeAt: string | null;
  salarie: { prenom: string; nom: string }; jours: JourReleve[]; absences: AbsenceReleve[];
};

const FILTRES = [
  { value: "Envoyé", label: "📤 À valider" },
  { value: "tout", label: "Tous (envoyés, validés, refusés)" },
  { value: "Validé", label: "✅ Validés" },
  { value: "Refusé", label: "↩️ Refusés" },
  { value: "Brouillon", label: "📝 En cours de saisie (brouillons)" },
];

/** Liste des relevés d'heures avec calendrier et validation (onglet « Relevés » client et admin) */
export default function ListeReleves({ admin = false }: { admin?: boolean }) {
  const [filtre, setFiltre] = useState("Envoyé");
  const [mois, setMois] = useState("");
  const [entrepriseId, setEntrepriseId] = useState("");
  const [entreprises, setEntreprises] = useState<{ id: string; nom: string }[]>([]);
  const [releves, setReleves] = useState<Releve[]>([]);
  const [chargement, setChargement] = useState(true);
  const [occupe, setOccupe] = useState(false);
  const [ouvert, setOuvert] = useState<string | null>(null);

  const charger = useCallback(async (f: string, m: string, e: string) => {
    setChargement(true);
    const q = new URLSearchParams({ statut: f });
    if (m) q.set("mois", m);
    if (e) q.set("entrepriseId", e);
    const d = await fetch(`/api/heures?${q}`).then((r) => r.json()).catch(() => []);
    setReleves(Array.isArray(d) ? d : []);
    setChargement(false);
  }, []);

  useEffect(() => {
    if (admin) fetch("/api/entreprises").then((r) => r.json()).then((d) => Array.isArray(d) && setEntreprises(d));
  }, [admin]);
  useEffect(() => { charger(filtre, mois, entrepriseId); }, [filtre, mois, entrepriseId, charger]);

  async function decider(r: Releve, statut: "Validé" | "Refusé") {
    let motif: string | null = null;
    if (statut === "Refusé") {
      motif = prompt("Motif du refus (le relevé sera rouvert au salarié pour correction) :");
      if (motif === null) return;
    }
    setOccupe(true);
    const res = await fetch(`/api/heures/${r.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut, motif }) });
    setOccupe(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.erreur || "Erreur");
    }
    charger(filtre, mois, entrepriseId);
  }

  const btn = (fond: string): React.CSSProperties => ({ background: fond, color: "#ffffff", border: "none", borderRadius: "8px", padding: "8px 14px", fontSize: "14px", fontWeight: 700, cursor: "pointer", opacity: occupe ? 0.6 : 1 });

  return (
        <div className="flex flex-col gap-6" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
            <div>
              <h1 className="text-3xl font-bold">⏱️ Relevés d&apos;heures</h1>
              {admin && <div className="flex gap-2 flex-wrap mt-3"><BoutonExportComplet jeu="releves" label="📥 Export complet (relevés + détail des jours)" /></div>}
              <p className="text-gray-500 mt-1">Tous les relevés mensuels des salariés{admin ? ", toutes entreprises confondues" : ""}. À la validation, les heures supplémentaires du mois sont ajoutées aux variables de paie.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <select value={filtre} onChange={(e) => setFiltre(e.target.value)} className="border rounded-lg px-3 py-2" aria-label="Statut">
                {FILTRES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <input type="month" value={mois} onChange={(e) => setMois(e.target.value)} className="border rounded-lg px-3 py-2" aria-label="Mois" />
              {mois && <button type="button" onClick={() => setMois("")} className="text-sm text-gray-500 underline">tous les mois</button>}
              {admin && (
                <select value={entrepriseId} onChange={(e) => setEntrepriseId(e.target.value)} className="border rounded-lg px-3 py-2" aria-label="Entreprise">
                  <option value="">Toutes les entreprises</option>
                  {entreprises.map((en) => <option key={en.id} value={en.id}>{en.nom}</option>)}
                </select>
              )}
            </div>
          </div>

          {chargement ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">Chargement…</div>
          ) : releves.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">{filtre === "Envoyé" ? "Aucun relevé à valider. 👍" : "Aucun relevé pour ces critères."}</div>
          ) : (
            releves.map((r) => {
              const totH = r.jours.reduce((a, j) => a + (j.heures || 0), 0);
              const totS = r.jours.reduce((a, j) => a + j.heuresSupp, 0);
              const st = STATUTS_RELEVE[r.statut] || STATUTS_RELEVE.Brouillon;
              const jours: Record<string, JourReleve> = Object.fromEntries(r.jours.map((j) => [j.date, j]));
              const commentaires = r.jours.filter((j) => j.commentaire);
              return (
                <div key={r.id} className="bg-white rounded-xl shadow p-5">
                  <div className="flex justify-between items-center gap-3 flex-wrap">
                    <div>
                      <p className="font-bold text-lg">{r.salarie.prenom} {r.salarie.nom} — {NOMS_MOIS[r.mois - 1]} {r.annee}</p>
                      {admin && r.entreprise && <p className="text-sm font-semibold text-gray-500">🏢 {r.entreprise.nom}</p>}
                      <p className="text-sm text-gray-600">
                        {fmtH(totH)}{totS > 0 ? <> · dont <strong style={{ color: "#c2410c" }}>{fmtH(totS)} supp.</strong></> : ""}
                        {r.envoyeAt ? ` · envoyé le ${new Date(r.envoyeAt).toLocaleDateString("fr-FR")}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                      <span style={{ background: st.fond, color: st.texte, borderRadius: "999px", padding: "4px 10px", fontSize: "12px", fontWeight: 700 }}>{r.statut}</span>
                      <button type="button" onClick={() => setOuvert(ouvert === r.id ? null : r.id)} style={{ border: "1px solid #d1d5db", background: "#ffffff", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", cursor: "pointer" }}>
                        {ouvert === r.id ? "Masquer" : "🗓️ Voir le calendrier"}
                      </button>
                      {r.statut === "Envoyé" && (
                        <>
                          <button type="button" disabled={occupe} onClick={() => decider(r, "Validé")} style={btn("#16a34a")}>✅ Valider</button>
                          <button type="button" disabled={occupe} onClick={() => decider(r, "Refusé")} style={btn("#dc2626")}>↩️ Refuser</button>
                        </>
                      )}
                      {admin && (
                        <>
                          <BoutonModifierAdmin modele="releveMois" id={r.id} valeurs={{ statut: r.statut, motifRefus: r.motifRefus }} onFait={() => charger(filtre, mois, entrepriseId)} />
                          <BoutonSupprimerAdmin modele="releveMois" id={r.id} quoi="ce relevé et tous ses jours" />
                        </>
                      )}
                    </div>
                  </div>
                  {r.statut === "Refusé" && r.motifRefus && <p className="text-sm text-red-600 mt-2">Motif du refus : {r.motifRefus}</p>}
                  {ouvert === r.id && (
                    <div className="mt-4" style={{ maxWidth: "560px" }}>
                      <CalendrierReleve premier={r.premier} jours={jours} absences={r.absences} />
                      {commentaires.length > 0 && (
                        <ul className="mt-3 text-sm text-gray-600 flex flex-col gap-1">
                          {commentaires.map((j) => (
                            <li key={j.date}>💬 {new Date(`${j.date}T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC" })} : {j.commentaire}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
  );
}
