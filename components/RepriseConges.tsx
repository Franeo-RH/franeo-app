"use client";

import { useCallback, useEffect, useState } from "react";
import ChoixFichier from "@/components/ChoixFichier";

type Sal = {
  id: string; matricule: string | null; nom: string; prenom: string; btp: boolean;
  congesRepriseDate: string | null; congesRepriseReste: number | null; congesRepriseEnCours: number | null;
  reste: number; enCours: number; pris: number;
};
type Ligne = { reste: string; enCours: string };

const auj = () => new Date().toISOString().slice(0, 10);
const fr = (d: string) => new Date(d).toLocaleDateString("fr-FR", { timeZone: "UTC" });

/**
 * Soldes de congés de tous les salariés : solde actuel calculé, et mise à jour du solde de départ
 * (saisie ou import Excel, une fois au début ou chaque mois). L'application recalcule ensuite tout seule.
 */
export default function RepriseConges({ entrepriseId, modifiable = true }: { entrepriseId?: string; modifiable?: boolean }) {
  const q = entrepriseId ? `?entrepriseId=${entrepriseId}` : "";
  const [liste, setListe] = useState<Sal[] | null>(null);
  const [valeurs, setValeurs] = useState<Record<string, Ligne>>({});
  const [modifies, setModifies] = useState<Set<string>>(new Set());
  const [date, setDate] = useState(auj());
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [rejets, setRejets] = useState<{ ligne: number; nom: string; erreur?: string }[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [recherche, setRecherche] = useState("");

  const charger = useCallback(async () => {
    const r = await fetch(`/api/conges/reprise${q}`);
    const l: Sal[] = r.ok ? await r.json() : [];
    setListe(l);
    setValeurs(Object.fromEntries(l.map((s) => [s.id, { reste: String(s.reste), enCours: String(s.enCours) }])));
    setModifies(new Set());
  }, [q]);
  useEffect(() => { charger(); }, [charger]);

  const changer = (id: string, v: Ligne) => { setValeurs((x) => ({ ...x, [id]: v })); setModifies((m) => new Set(m).add(id)); };

  async function importer(f: File) {
    setMsg(null); setRejets([]);
    const fd = new FormData();
    fd.append("fichier", f);
    if (entrepriseId) fd.append("entrepriseId", entrepriseId);
    const r = await fetch("/api/conges/reprise/import", { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg({ ok: false, t: j.erreur || "Import impossible" }); return; }
    const ok = (j.lignes as { salarieId: string | null; reste: number | null; enCours: number | null; erreur?: string }[]).filter((l) => l.salarieId && !l.erreur);
    setValeurs((v) => ({ ...v, ...Object.fromEntries(ok.map((l) => [l.salarieId!, { reste: l.reste?.toString() ?? "", enCours: l.enCours?.toString() ?? "" }])) }));
    setModifies((m) => { const n = new Set(m); ok.forEach((l) => n.add(l.salarieId!)); return n; });
    setRejets((j.lignes as { ligne: number; nom: string; erreur?: string }[]).filter((l) => l.erreur));
    setMsg({ ok: true, t: `📥 ${ok.length} salarié(s) lus dans le fichier : vérifiez la date du solde puis cliquez sur « Enregistrer ».` });
  }

  async function enregistrer() {
    if (!modifies.size) { setMsg({ ok: false, t: "Aucun solde modifié." }); return; }
    setEnvoi(true); setMsg(null);
    const r = await fetch("/api/conges/reprise", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entrepriseId, date, lignes: [...modifies].map((salarieId) => ({ salarieId, ...valeurs[salarieId] })) }),
    });
    const j = await r.json().catch(() => ({}));
    setEnvoi(false);
    if (!r.ok) { setMsg({ ok: false, t: j.erreur || "Enregistrement impossible" }); return; }
    setMsg({ ok: true, t: `✅ ${j.maj} solde(s) mis à jour au ${fr(date)}${j.erreurs ? ` · ${j.erreurs} ligne(s) avec un nombre invalide ignorée(s)` : ""}. Le calcul continue automatiquement à partir de ces chiffres.` });
    charger();
  }

  if (!liste) return <div className="bg-white rounded-xl shadow p-6 text-gray-500">Chargement…</div>;
  if (liste.length === 0) return <div className="bg-white rounded-xl shadow p-6 text-sm text-gray-600">Aucun salarié actif.</div>;
  const f = recherche.trim().toLowerCase();
  const vues = liste.filter((s) => !f || `${s.prenom} ${s.nom} ${s.matricule ?? ""}`.toLowerCase().includes(f));
  const champ = "border rounded-lg px-2 py-1 w-20 text-right";
  const total = liste.reduce((t, s) => t + s.reste, 0);

  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
      <div className="flex justify-between gap-3 flex-wrap items-start">
        <div>
          <h2 className="text-xl font-bold">🏖️ Soldes de congés payés</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-3xl">
            Les soldes se calculent tout seuls : 2,5 jours par mois travaillé (BTP : par tranche de 150 heures), moins les congés pris validés.
            Pour les caler sur votre logiciel de paie ou votre caisse, saisissez ou importez les soldes à une date (au début, ou chaque mois).
          </p>
        </div>
        <p className="text-sm font-semibold bg-gray-50 rounded-lg px-3 py-2">{liste.length} salarié(s) · {total} j à prendre au total</p>
      </div>

      {modifiable && (
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-sm font-semibold">Soldes arrêtés au<input type="date" max={auj()} value={date} onChange={(e) => setDate(e.target.value)} className="border rounded-lg px-3 py-2 block mt-1" /></label>
          <a href={`/api/conges/reprise${q}${q ? "&" : "?"}format=xlsx`} className="border rounded-lg px-4 py-2 font-semibold text-sm">📄 Modèle Excel (avec les soldes actuels)</a>
          <div className="text-sm"><ChoixFichier accept=".xlsx,.xls" fichiers={fichiers} onChange={(l) => { setFichiers(l); if (l[0]) importer(l[0]); }} texte="📥 Importer les soldes" /></div>
        </div>
      )}

      {msg && <p className="text-sm font-semibold" style={{ color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.t}</p>}
      {rejets.length > 0 && <ul className="text-xs text-red-700 list-disc pl-5">{rejets.slice(0, 20).map((r) => <li key={r.ligne}>Ligne {r.ligne} ({r.nom || "—"}) : {r.erreur}</li>)}</ul>}

      <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="🔎 Rechercher un salarié" className="border rounded-lg px-3 py-2 max-w-sm" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left bg-gray-50">
            <tr>
              <th className="p-2">Salarié</th><th className="p-2 text-right">Reste à prendre</th><th className="p-2 text-right">En cours d&apos;acquisition</th><th className="p-2 text-right">Pris</th><th className="p-2">Solde de départ</th>
            </tr>
          </thead>
          <tbody>
            {vues.map((s) => {
              const v = valeurs[s.id] ?? { reste: "", enCours: "" };
              const modif = modifies.has(s.id);
              return (
                <tr key={s.id} className="border-t" style={modif ? { background: "#fff7ed" } : undefined}>
                  <td className="p-2">
                    <span className="font-semibold">{s.prenom} {s.nom}</span>{s.matricule && <span className="text-xs text-gray-400"> · {s.matricule}</span>}
                    {s.btp && <span className="ml-2 text-[10px] font-bold text-orange-700 bg-orange-50 rounded-full px-2 py-0.5">BTP</span>}
                  </td>
                  <td className="p-2 text-right">{modifiable ? <><input inputMode="decimal" value={v.reste} onChange={(e) => changer(s.id, { ...v, reste: e.target.value })} className={champ} aria-label={`Reste à prendre ${s.prenom} ${s.nom}`} /> j</> : <strong>{s.reste} j</strong>}</td>
                  <td className="p-2 text-right">{modifiable ? <><input inputMode="decimal" value={v.enCours} onChange={(e) => changer(s.id, { ...v, enCours: e.target.value })} className={champ} aria-label={`En cours ${s.prenom} ${s.nom}`} /> j</> : `${s.enCours} j`}</td>
                  <td className="p-2 text-right text-gray-500">{s.pris} j</td>
                  <td className="p-2 text-xs text-gray-500">{s.congesRepriseDate ? `au ${fr(s.congesRepriseDate)} : ${s.congesRepriseReste ?? 0} / ${s.congesRepriseEnCours ?? 0} j` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {modifiable && (
        <div className="flex flex-wrap gap-3 items-center">
          <button type="button" onClick={enregistrer} disabled={envoi || !modifies.size} className="bg-orange-500 text-white rounded-lg px-5 py-2 font-semibold disabled:opacity-50">{envoi ? "Enregistrement…" : `💾 Enregistrer ${modifies.size ? `(${modifies.size})` : ""}`}</button>
          <p className="text-xs text-gray-500">Seules les lignes modifiées (en orange) sont enregistrées, avec la date choisie. Les congés pris après cette date sont déduits automatiquement.</p>
        </div>
      )}
    </div>
  );
}
