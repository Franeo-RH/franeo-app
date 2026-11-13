"use client";

import { useState } from "react";

export type Conflit = { projetId: string; projet?: string; affectationId: string; salarieId?: string; salarie: string; du: string; au: string; type: string; statut: string };

const dateFR = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const libelle = (t: string) => t.toLowerCase().replace(/_/g, " ").replace("conge", "congé").replace("paye", "payé");

/**
 * Salariés planifiés pendant une absence (validée ou en attente) :
 * en 1 clic, retirer ces jours du planning, ou les confier à un remplaçant.
 */
export default function ConflitsAbsences({ conflits, salaries, peutGerer, onChange }: {
  conflits: Conflit[]; salaries: { id: string; nom: string }[]; peutGerer: boolean; onChange: () => void;
}) {
  const [remplacant, setRemplacant] = useState<Record<string, string>>({});
  const [occupe, setOccupe] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  if (!conflits.length) return null;

  async function ajuster(projetId: string, corps: Record<string, unknown>, cle: string) {
    setOccupe(cle); setMsg(null);
    const r = await fetch(`/api/projets/${projetId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "retirerAbsence", ...corps }) });
    const j = await r.json().catch(() => ({}));
    setOccupe(null);
    setMsg(r.ok ? { ok: true, t: `✅ ${j.message}` } : { ok: false, t: `❌ ${j.erreur || "Ajustement impossible"}` });
    if (r.ok) onChange();
  }
  async function toutAjuster() {
    setOccupe("tout"); setMsg(null);
    let total = 0;
    for (const projetId of [...new Set(conflits.map((c) => c.projetId))]) {
      const r = await fetch(`/api/projets/${projetId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "retirerAbsence" }) });
      const j = await r.json().catch(() => ({}));
      total += j.jours ?? 0;
    }
    setOccupe(null);
    setMsg({ ok: true, t: `✅ ${total} jour(s) d'absence retiré(s) du planning.` });
    onChange();
  }

  return (
    <div className="rounded-xl p-4 mb-3 text-sm" style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
      <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
        <p className="font-bold" style={{ color: "#c2410c" }}>⚠️ {conflits.length} salarié(s) planifié(s) pendant une absence</p>
        {peutGerer && conflits.length > 1 && (
          <button type="button" disabled={!!occupe} onClick={toutAjuster} className="bg-black text-white rounded-lg px-3 py-2 font-semibold disabled:opacity-50">
            {occupe === "tout" ? "Ajustement…" : "Tout ajuster (retirer les jours d'absence)"}
          </button>
        )}
      </div>
      <ul className="flex flex-col gap-2">
        {conflits.map((c) => {
          const cle = `${c.affectationId}|${c.du}`;
          const enAttente = /attente/i.test(c.statut);
          return (
            <li key={cle} className="bg-white rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>{c.salarie}</strong>{c.projet ? <> · {c.projet}</> : null} — {libelle(c.type)} du {dateFR(c.du)} au {dateFR(c.au)}
                <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: enAttente ? "#fef3c7" : "#dcfce7", color: enAttente ? "#92400e" : "#166534" }}>{enAttente ? "prévisionnelle, pas encore acceptée" : "validée"}</span>
              </span>
              {peutGerer && (
                <span className="flex flex-wrap items-center gap-2">
                  <button type="button" disabled={!!occupe} onClick={() => ajuster(c.projetId, { affectationId: c.affectationId, du: c.du.slice(0, 10), au: c.au.slice(0, 10) }, cle)} className="border border-orange-400 text-orange-700 rounded-lg px-3 py-1 font-semibold disabled:opacity-50">
                    {occupe === cle ? "…" : "Retirer ces jours"}
                  </button>
                  <select value={remplacant[cle] ?? ""} onChange={(e) => setRemplacant({ ...remplacant, [cle]: e.target.value })} className="border rounded-lg px-2 py-1" aria-label="Remplaçant">
                    <option value="">Remplacer par…</option>
                    {salaries.filter((s) => s.id !== c.salarieId && s.nom !== c.salarie).map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                  </select>
                  {remplacant[cle] && (
                    <button type="button" disabled={!!occupe} onClick={() => ajuster(c.projetId, { affectationId: c.affectationId, du: c.du.slice(0, 10), au: c.au.slice(0, 10), remplacantId: remplacant[cle] }, cle)} className="bg-orange-500 text-white rounded-lg px-3 py-1 font-semibold disabled:opacity-50">
                      Remplacer
                    </button>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {msg && <p className="mt-2 font-semibold" style={{ color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.t}</p>}
      <p className="mt-2 text-xs text-gray-600">« Retirer ces jours » coupe l&apos;affectation autour de l&apos;absence : le salarié reste planifié avant et après. « Remplacer » confie les mêmes jours, avec le même volume d&apos;heures, au salarié choisi.</p>
    </div>
  );
}
