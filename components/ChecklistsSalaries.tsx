"use client";

import { useEffect, useState } from "react";
import { ETAPES } from "@/lib/checklists";

type S = { id: string; prenom: string; nom: string; poste: string; date: string; faits: string[] };

/** Gestion RH › Arrivées & départs : une checklist par salarié qui arrive ou qui part */
export default function ChecklistsSalaries({ modifiable }: { modifiable: boolean }) {
  const [d, setD] = useState<{ arrivees: S[]; departs: S[] } | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const charger = () => fetch("/api/checklists").then((r) => r.json()).then((x) => x.arrivees && setD(x)).catch(() => {});
  useEffect(() => { charger(); }, []);

  async function cocher(s: S, type: "ARRIVEE" | "DEPART", cle: string, fait: boolean) {
    setD((x) => x && { ...x, [type === "ARRIVEE" ? "arrivees" : "departs"]: x[type === "ARRIVEE" ? "arrivees" : "departs"].map((y) => (y.id === s.id ? { ...y, faits: fait ? [...y.faits, cle] : y.faits.filter((f) => f !== cle) } : y)) });
    await fetch("/api/checklists", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ salarieId: s.id, type, cle, fait }) });
  }

  if (!d) return <p className="text-gray-500">Chargement…</p>;
  const bloc = (titre: string, type: "ARRIVEE" | "DEPART", liste: S[], vide: string) => (
    <section className="bg-white rounded-xl shadow p-6 flex flex-col gap-3">
      <h2 className="text-lg font-bold">{titre} ({liste.length})</h2>
      {liste.length === 0 && <p className="text-sm text-gray-500">{vide}</p>}
      {liste.map((s) => {
        const etapes = ETAPES[type];
        const n = etapes.filter((e) => s.faits.includes(e.cle)).length;
        const cle = `${type}-${s.id}`;
        return (
          <div key={cle} className="border rounded-xl">
            <button type="button" onClick={() => setOuvert(ouvert === cle ? null : cle)} className="w-full flex justify-between items-center gap-3 p-3 text-left">
              <span>
                <span className="font-semibold">{s.prenom} {s.nom}</span>
                <span className="block text-xs text-gray-500">{s.poste} · {type === "ARRIVEE" ? "arrivée" : "départ"} le {new Date(s.date).toLocaleDateString("fr-FR")}</span>
              </span>
              <span className="flex items-center gap-3 shrink-0">
                <span className="w-28 h-2 rounded-full bg-gray-100 overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${(n / etapes.length) * 100}%`, background: n === etapes.length ? "#16a34a" : "#f97316" }} /></span>
                <span className="text-sm font-semibold" style={{ color: n === etapes.length ? "#15803d" : "#c2410c" }}>{n}/{etapes.length}</span>
              </span>
            </button>
            {ouvert === cle && (
              <ul className="border-t p-3 flex flex-col gap-2">
                {etapes.map((e) => (
                  <li key={e.cle}>
                    <label className="flex gap-3 items-start text-sm">
                      <input type="checkbox" className="mt-1 h-4 w-4 accent-orange-500" disabled={!modifiable} checked={s.faits.includes(e.cle)} onChange={(x) => cocher(s, type, e.cle, x.target.checked)} />
                      <span><span className={s.faits.includes(e.cle) ? "line-through text-gray-400" : ""}>{e.label}</span>{e.aide && <span className="block text-xs text-gray-500">{e.aide}</span>}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))" }}>
      {bloc("🛬 Arrivées", "ARRIVEE", d.arrivees, "Aucune arrivée récente ou prévue.")}
      {bloc("🛫 Départs", "DEPART", d.departs, "Aucun départ récent ou prévu.")}
    </div>
  );
}
