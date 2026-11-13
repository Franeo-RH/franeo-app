"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { couleurMarge, eur, h, pct, Tuile } from "./outils";

type R = {
  annee: number;
  total: { projets: number; vendu: number; coutReel: number; marge: number; tauxMarge: number | null; projectionMarge: number };
  clients: { client: string; projets: number; vendu: number; coutReel: number; marge: number; tauxMarge: number | null; projection: number; heures: number }[];
  salaries: { salarieId: string; salarie: string; heures: number; heuresFacturables: number; cout: number; projets: string[]; capacite: number; occupation: number | null }[];
  projets: { id: string; nom: string; client: string | null; couleur: string; vendu: number; coutReel: number; margeReelle: number; tauxMargeReelle: number | null; tauxProjection: number | null }[];
};
type C = { tauxCharges: number; salaries: { id: string; salarie: string; poste: string; coutStandard: number | null; coutCalcule: number | null }[] };

export default function RentabiliteProjets() {
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [r, setR] = useState<R | null>(null);
  const [c, setC] = useState<C | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [saisie, setSaisie] = useState<Record<string, string>>({});
  const [ok, setOk] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const [a, b] = await Promise.all([fetch(`/api/projets/rentabilite?annee=${annee}`), fetch("/api/projets/couts")]);
    const ja = await a.json().catch(() => ({})), jb = await b.json().catch(() => ({}));
    if (!a.ok) { setErreur(ja.erreur || "Chargement impossible"); return; }
    setR(ja); if (b.ok) setC(jb);
  }, [annee]);
  useEffect(() => { charger(); }, [charger]);

  async function enregistrer(id: string) {
    setOk(null);
    const res = await fetch("/api/projets/couts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ salarieId: id, coutStandard: saisie[id] ?? "" }) });
    const j = await res.json().catch(() => ({}));
    setOk(res.ok ? "✅ Coût horaire enregistré : les projets sont recalculés." : `❌ ${j.erreur || "Enregistrement impossible"}`);
    if (res.ok) { setSaisie((s) => { const x = { ...s }; delete x[id]; return x; }); charger(); }
  }

  if (erreur) return <div className="bg-white rounded-xl shadow p-6 text-red-700">{erreur}</div>;
  if (!r) return <div className="bg-white rounded-xl shadow p-6 text-gray-500">Chargement…</div>;
  const meilleurs = [...r.projets].filter((p) => p.vendu > 0).sort((a, b) => (b.tauxMargeReelle ?? -999) - (a.tauxMargeReelle ?? -999));

  return (
    <>
      <div className="bg-white rounded-xl shadow p-4 flex gap-3 items-center">
        <label className="font-semibold">Année</label>
        <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))} className="border rounded-lg px-3 py-2">
          {[0, 1, 2, 3].map((i) => new Date().getFullYear() - i).map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="text-sm text-gray-500">Projets actifs dans l&apos;année (hors annulés).</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tuile titre="Projets" valeur={String(r.total.projets)} />
        <Tuile titre="Vendu" valeur={eur(r.total.vendu)} />
        <Tuile titre="Marge réelle" valeur={eur(r.total.marge)} detail={pct(r.total.tauxMarge)} couleur={couleurMarge(r.total.tauxMarge)} />
        <Tuile titre="Marge projetée en fin" valeur={eur(r.total.projectionMarge)} couleur={r.total.projectionMarge < 0 ? "#b91c1c" : "#15803d"} />
      </div>

      <div className="bg-white rounded-xl shadow p-6 overflow-x-auto">
        <h2 className="text-xl font-bold mb-3">🏷️ Par client</h2>
        <table className="w-full text-sm">
          <thead className="text-left bg-gray-50"><tr><th className="p-2">Client</th><th className="p-2">Projets</th><th className="p-2">Heures</th><th className="p-2">Vendu</th><th className="p-2">Coût réel</th><th className="p-2">Marge réelle</th><th className="p-2">Marge projetée</th></tr></thead>
          <tbody>
            {r.clients.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-gray-500">Aucun projet sur cette année.</td></tr>}
            {r.clients.map((x) => (
              <tr key={x.client} className="border-t">
                <td className="p-2 font-semibold">{x.client}</td><td className="p-2">{x.projets}</td><td className="p-2">{h(x.heures)}</td><td className="p-2">{eur(x.vendu)}</td><td className="p-2">{eur(x.coutReel)}</td>
                <td className="p-2 font-semibold" style={{ color: couleurMarge(x.tauxMarge) }}>{eur(x.marge)} ({pct(x.tauxMarge)})</td>
                <td className="p-2" style={{ color: x.projection < 0 ? "#b91c1c" : undefined }}>{eur(x.projection)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meilleurs.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-3">📈 Classement des projets par marge</h2>
          <ul className="space-y-2">
            {meilleurs.map((p) => {
              const t = p.tauxMargeReelle ?? 0;
              return (
                <li key={p.id} className="text-sm">
                  <div className="flex justify-between"><Link href={`/client/projets/${p.id}`} className="font-semibold underline">{p.nom}</Link><span style={{ color: couleurMarge(p.tauxMargeReelle) }}>{pct(p.tauxMargeReelle)} · {eur(p.margeReelle)}</span></div>
                  <div style={{ height: 8, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}><div style={{ width: `${Math.min(100, Math.abs(t))}%`, height: "100%", background: t < 0 ? "#dc2626" : p.couleur }} /></div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6 overflow-x-auto">
        <h2 className="text-xl font-bold mb-1">👥 Occupation des salariés</h2>
        <p className="text-sm text-gray-500 mb-3">Taux d&apos;occupation = heures sur des projets facturés ÷ heures du contrat depuis le 1er janvier (ou l&apos;entrée).</p>
        <table className="w-full text-sm">
          <thead className="text-left bg-gray-50"><tr><th className="p-2">Salarié</th><th className="p-2">Heures projets</th><th className="p-2">dont facturables</th><th className="p-2">Capacité</th><th className="p-2">Occupation</th><th className="p-2">Coût</th><th className="p-2">Projets</th></tr></thead>
          <tbody>
            {r.salaries.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-gray-500">Aucun temps sur des projets.</td></tr>}
            {r.salaries.map((x) => (
              <tr key={x.salarieId} className="border-t">
                <td className="p-2 font-semibold">{x.salarie}</td><td className="p-2">{h(x.heures)}</td><td className="p-2">{h(x.heuresFacturables)}</td><td className="p-2">{h(x.capacite)}</td>
                <td className="p-2 font-semibold">{pct(x.occupation)}</td><td className="p-2">{eur(x.cout)}</td><td className="p-2 text-xs text-gray-600">{x.projets.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {c && (
        <div className="bg-white rounded-xl shadow p-6 overflow-x-auto">
          <h2 className="text-xl font-bold mb-1">💶 Coûts horaires chargés</h2>
          <p className="text-sm text-gray-500 mb-3">
            Calculé = salaire mensuel × (1 + {c.tauxCharges} % de charges) ÷ heures mensuelles du contrat. Vous pouvez fixer un <strong>coût standard</strong> (stable sur l&apos;année, plus simple pour piloter) : il remplace le calcul. Laissez vide pour revenir au calcul.
          </p>
          {ok && <p className="text-sm font-semibold mb-2">{ok}</p>}
          <table className="w-full text-sm">
            <thead className="text-left bg-gray-50"><tr><th className="p-2">Salarié</th><th className="p-2">Poste</th><th className="p-2">Calculé</th><th className="p-2">Coût standard (€/h)</th><th className="p-2">Retenu</th></tr></thead>
            <tbody>
              {c.salaries.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-2 font-semibold">{s.salarie}</td><td className="p-2">{s.poste}</td>
                  <td className="p-2">{s.coutCalcule == null ? <span className="text-orange-700">salaire manquant</span> : `${s.coutCalcule.toLocaleString("fr-FR")} €/h`}</td>
                  <td className="p-2">
                    <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); enregistrer(s.id); }}>
                      <input type="number" min="0" step="0.01" className="border rounded px-2 py-1 w-24" value={saisie[s.id] ?? (s.coutStandard?.toString() ?? "")} onChange={(e) => setSaisie({ ...saisie, [s.id]: e.target.value })} />
                      {saisie[s.id] !== undefined && <button type="submit" className="bg-black text-white rounded px-2 text-xs font-semibold">OK</button>}
                    </form>
                  </td>
                  <td className="p-2 font-semibold">{(s.coutStandard ?? s.coutCalcule) == null ? "—" : `${(s.coutStandard ?? s.coutCalcule)!.toLocaleString("fr-FR")} €/h`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
