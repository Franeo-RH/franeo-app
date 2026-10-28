"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import CalendrierReleve from "@/components/CalendrierReleve";
import { fmtH, NOMS_MOIS, STATUTS_RELEVE, type AbsenceReleve, type JourReleve } from "@/lib/heures";

type Releve = {
  id: string; mois: number; annee: number; premier: string; statut: string; motifRefus: string | null; envoyeAt: string | null;
  salarie: { prenom: string; nom: string }; jours: JourReleve[]; absences: AbsenceReleve[];
};

export default function ClientHeures() {
  const [prenom, setPrenom] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [filtre, setFiltre] = useState<"Envoyé" | "tout">("Envoyé");
  const [releves, setReleves] = useState<Releve[]>([]);
  const [chargement, setChargement] = useState(true);
  const [occupe, setOccupe] = useState(false);
  const [ouvert, setOuvert] = useState<string | null>(null);

  const charger = useCallback(async (f: string) => {
    setChargement(true);
    const d = await fetch(`/api/heures?statut=${encodeURIComponent(f)}`).then((r) => r.json()).catch(() => []);
    setReleves(Array.isArray(d) ? d : []);
    setChargement(false);
  }, []);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => { if (d.prenom) setPrenom(d.prenom); if (d.permissions) setPermissions(d.permissions); });
  }, []);
  useEffect(() => { charger(filtre); }, [filtre, charger]);

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
    charger(filtre);
  }

  const btn = (fond: string): React.CSSProperties => ({ background: fond, color: "#ffffff", border: "none", borderRadius: "8px", padding: "8px 14px", fontSize: "14px", fontWeight: 700, cursor: "pointer", opacity: occupe ? 0.6 : 1 });

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="CLIENT" prenom={prenom} permissions={permissions} />
      <div className="flex">
        <Sidebar role="CLIENT" />
        <main className="flex-1 p-6 md:p-10 flex flex-col gap-6" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-6 flex justify-between items-center gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">⏱️ Relevés d&apos;heures</h1>
              <p className="text-gray-500 mt-1">Relevés mensuels envoyés par vos salariés. À la validation, les heures supplémentaires du mois sont ajoutées aux variables de paie.</p>
            </div>
            <select value={filtre} onChange={(e) => setFiltre(e.target.value as "Envoyé" | "tout")} className="border rounded-lg px-3 py-2">
              <option value="Envoyé">À valider</option>
              <option value="tout">Tous les relevés</option>
            </select>
          </div>

          {chargement ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">Chargement…</div>
          ) : releves.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">{filtre === "Envoyé" ? "Aucun relevé à valider. 👍" : "Aucun relevé pour le moment."}</div>
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
        </main>
      </div>
    </div>
  );
}
