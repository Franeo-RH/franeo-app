"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { h } from "./outils";
import ConflitsAbsences, { type Conflit } from "./ConflitsAbsences";

type Case = { semaine: string; projets: { projetId: string; nom: string; code: string | null; couleur: string; heures: number }[]; joursAbsence: number; absences: string[]; capacite: number; planifie: number; charge: number; conflit: boolean };
type Ligne = { salarieId: string; salarie: string; poste: string; service: string | null; capaciteSemaine: number; cases: Case[] };

const lundiDe = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.toISOString().slice(0, 10); };
const decaler = (j: string, semaines: number) => { const x = new Date(j + "T12:00:00"); x.setDate(x.getDate() + semaines * 7); return x.toISOString().slice(0, 10); };
const fondCharge = (c: number) => (c === 0 ? "#f9fafb" : c > 100 ? "#fee2e2" : c >= 85 ? "#dcfce7" : c >= 50 ? "#fef9c3" : "#f3f4f6");

/** Plan de charge : salariés × semaines, heures planifiées par projet, absences et surcharges */
export default function PlanningProjets() {
  const [du, setDu] = useState(lundiDe(new Date()));
  const [nb, setNb] = useState(8);
  const [d, setD] = useState<{ semaines: string[]; lignes: Ligne[]; conflits: Conflit[]; peutGerer: boolean } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState("");
  const [seulementCharges, setSeulementCharges] = useState(false);

  const charger = useCallback(async () => {
    setD(null);
    const r = await fetch(`/api/projets/planning?du=${du}&semaines=${nb}`);
    const j = await r.json().catch(() => ({}));
    if (r.ok) setD(j); else setErreur(j.erreur || "Chargement impossible");
  }, [du, nb]);
  useEffect(() => { charger(); }, [charger]);

  const lignes = useMemo(() => {
    const f = filtre.trim().toLowerCase();
    return (d?.lignes || []).filter((l) => (!f || `${l.salarie} ${l.poste} ${l.service ?? ""}`.toLowerCase().includes(f)) && (!seulementCharges || l.cases.some((c) => c.planifie > 0)));
  }, [d, filtre, seulementCharges]);
  const legende = useMemo(() => {
    const m = new Map<string, { nom: string; couleur: string; heures: number }>();
    for (const l of d?.lignes || []) for (const c of l.cases) for (const p of c.projets) {
      const x = m.get(p.projetId) ?? { nom: p.nom, couleur: p.couleur, heures: 0 };
      x.heures += p.heures; m.set(p.projetId, x);
    }
    return [...m.entries()];
  }, [d]);
  const surcharges = (d?.lignes || []).flatMap((l) => l.cases.filter((c) => c.charge > 100).map((c) => ({ l, c })));

  if (erreur) return <div className="bg-white rounded-xl shadow p-6 text-red-700">{erreur}</div>;

  return (
    <>
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-center">
        <button type="button" onClick={() => setDu(decaler(du, -nb))} className="border rounded-lg px-3 py-2 font-semibold">◀</button>
        <input type="date" value={du} onChange={(e) => e.target.value && setDu(lundiDe(new Date(e.target.value + "T12:00:00")))} className="border rounded-lg px-3 py-2" />
        <button type="button" onClick={() => setDu(decaler(du, nb))} className="border rounded-lg px-3 py-2 font-semibold">▶</button>
        <button type="button" onClick={() => setDu(lundiDe(new Date()))} className="border rounded-lg px-3 py-2">Aujourd&apos;hui</button>
        <select value={nb} onChange={(e) => setNb(Number(e.target.value))} className="border rounded-lg px-3 py-2">
          {[4, 8, 12, 26].map((n) => <option key={n} value={n}>{n} semaines</option>)}
        </select>
        <input value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder="Salarié, poste, service" className="border rounded-lg px-3 py-2 flex-1 min-w-[160px]" />
        <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={seulementCharges} onChange={(e) => setSeulementCharges(e.target.checked)} /> Seulement les salariés planifiés</label>
      </div>

      {d && <ConflitsAbsences conflits={d.conflits} salaries={d.lignes.map((l) => ({ id: l.salarieId, nom: l.salarie }))} peutGerer={d.peutGerer} onChange={charger} />}
      {surcharges.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 text-sm space-y-1">
          {surcharges.length > 0 && <p className="text-red-700 font-semibold">🔴 Surcharge : {surcharges.map(({ l, c }) => `${l.salarie} (sem. du ${new Date(c.semaine).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} : ${c.charge} %)`).join(" · ")}</p>}
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        {!d ? <p className="p-6 text-gray-500">Chargement…</p> : (
          <table className="text-sm fr-tableau-fixe" style={{ borderCollapse: "collapse", minWidth: "100%" }}>
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-3 sticky left-0 bg-gray-50" style={{ minWidth: 180 }}>Salarié</th>
                {d.semaines.map((s) => <th key={s} className="p-2 text-center whitespace-nowrap" style={{ minWidth: 110 }}>Sem. du {new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</th>)}
              </tr>
            </thead>
            <tbody>
              {lignes.length === 0 && <tr><td colSpan={d.semaines.length + 1} className="p-6 text-center text-gray-500">Aucun salarié.</td></tr>}
              {lignes.map((l) => (
                <tr key={l.salarieId} className="border-t">
                  <td className="p-3 sticky left-0 bg-white"><p className="font-semibold">{l.salarie}</p><p className="text-xs text-gray-500">{l.poste} · {l.capaciteSemaine} h/sem.</p></td>
                  {l.cases.map((c) => (
                    <td key={c.semaine} className="p-1 align-top" style={{ background: fondCharge(c.charge), borderLeft: "1px solid #e5e7eb" }} title={`${h(c.planifie)} planifiées / ${h(c.capacite)} disponibles${c.joursAbsence ? ` · ${c.joursAbsence} j d'absence` : ""}`}>
                      {c.projets.map((p) => (
                        <Link key={p.projetId} href={`/client/projets/${p.projetId}`} className="block rounded px-1 mb-1 text-xs font-semibold text-white truncate" style={{ background: p.couleur, maxWidth: 120 }}>{p.code || p.nom} · {p.heures}h</Link>
                      ))}
                      {c.joursAbsence > 0 && <span className="block text-xs text-gray-600">🏖️ {c.joursAbsence} j</span>}
                      {c.planifie > 0 && <span className="block text-xs font-bold" style={{ color: c.charge > 100 ? "#b91c1c" : "#374151" }}>{c.charge} %</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-4 text-sm flex flex-wrap gap-4 items-center">
        <span className="font-semibold">Légende :</span>
        {legende.map(([id, x]) => <Link key={id} href={`/client/projets/${id}`} className="flex items-center gap-1"><span style={{ width: 12, height: 12, borderRadius: 3, background: x.couleur }} />{x.nom} ({h(Math.round(x.heures))})</Link>)}
        <span className="flex items-center gap-1"><span style={{ width: 12, height: 12, background: "#fef9c3" }} /> 50–85 %</span>
        <span className="flex items-center gap-1"><span style={{ width: 12, height: 12, background: "#dcfce7" }} /> 85–100 %</span>
        <span className="flex items-center gap-1"><span style={{ width: 12, height: 12, background: "#fee2e2" }} /> surcharge</span>
      </div>
      <p className="text-xs text-gray-500">La capacité tient compte des heures du contrat et des absences (validées ou en attente). Pour planifier quelqu&apos;un, ouvrez le projet › Planning du projet.</p>
    </>
  );
}
