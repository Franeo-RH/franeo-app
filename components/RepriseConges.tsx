"use client";

import { useCallback, useEffect, useState } from "react";
import ChoixFichier from "@/components/ChoixFichier";

type Sal = { id: string; matricule: string | null; nom: string; prenom: string; congesRepriseDate: string | null; congesRepriseReste: number | null; congesRepriseEnCours: number | null };
type Ligne = { reste: string; enCours: string };

const auj = () => new Date().toISOString().slice(0, 10);
const fr = (d: string) => new Date(d).toLocaleDateString("fr-FR", { timeZone: "UTC" });

/**
 * Congés BTP : saisie ou import du solde de départ de chaque salarié (à une date donnée).
 * L'application calcule ensuite automatiquement les jours acquis et pris à partir de ce solde.
 */
export default function RepriseConges({ entrepriseId }: { entrepriseId?: string }) {
  const q = entrepriseId ? `?entrepriseId=${entrepriseId}` : "";
  const [liste, setListe] = useState<Sal[] | null>(null);
  const [valeurs, setValeurs] = useState<Record<string, Ligne>>({});
  const [date, setDate] = useState(auj());
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [rejets, setRejets] = useState<{ ligne: number; nom: string; erreur?: string }[]>([]);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    const r = await fetch(`/api/conges/reprise${q}`);
    const l: Sal[] = r.ok ? await r.json() : [];
    setListe(l);
    setValeurs(Object.fromEntries(l.map((s) => [s.id, { reste: s.congesRepriseReste?.toString() ?? "", enCours: s.congesRepriseEnCours?.toString() ?? "" }])));
    const d = l.find((s) => s.congesRepriseDate)?.congesRepriseDate;
    if (d) setDate(d.slice(0, 10));
  }, [q]);
  useEffect(() => { charger(); }, [charger]);

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
    setRejets((j.lignes as { ligne: number; nom: string; erreur?: string }[]).filter((l) => l.erreur));
    setMsg({ ok: true, t: `📥 ${ok.length} salarié(s) lus dans le fichier : vérifiez puis cliquez sur « Enregistrer ».` });
  }

  async function enregistrer() {
    setEnvoi(true); setMsg(null);
    const r = await fetch("/api/conges/reprise", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entrepriseId, date, lignes: Object.entries(valeurs).map(([salarieId, v]) => ({ salarieId, ...v })) }),
    });
    const j = await r.json().catch(() => ({}));
    setEnvoi(false);
    if (!r.ok) { setMsg({ ok: false, t: j.erreur || "Enregistrement impossible" }); return; }
    setMsg({ ok: true, t: `✅ Soldes enregistrés (${j.maj} salarié(s))${j.erreurs ? ` · ${j.erreurs} ligne(s) avec un nombre invalide ignorée(s)` : ""}. Les compteurs sont recalculés à partir du ${fr(date)}.` });
    charger();
  }

  if (!liste) return <div className="bg-white rounded-xl shadow p-6 text-gray-500">Chargement…</div>;
  if (liste.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-6 text-sm text-gray-600">
        Aucun salarié rattaché à une convention du BTP. Indiquez « BTP » (ou le n° IDCC, ex. 1597) dans la convention collective de l&apos;entreprise ou des salariés concernés.
      </div>
    );
  }
  const champ = "border rounded-lg px-2 py-1 w-24 text-right";

  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">🏗️ Solde de départ des congés BTP</h2>
        <p className="text-sm text-gray-500 mt-1">
          Indiquez, à une date donnée, les jours restant à prendre et les jours déjà acquis sur la période en cours (depuis le 1er avril), par exemple ceux de votre relevé de la caisse CIBTP.
          L&apos;application calcule ensuite tout automatiquement : jours acquis avec les heures travaillées, congés pris, solde.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-sm font-semibold">Solde arrêté au<input type="date" max={auj()} value={date} onChange={(e) => setDate(e.target.value)} className="border rounded-lg px-3 py-2 block mt-1" /></label>
        <a href={`/api/conges/reprise${q}${q ? "&" : "?"}format=xlsx`} className="border rounded-lg px-4 py-2 font-semibold text-sm">📄 Télécharger le modèle Excel</a>
        <div className="text-sm"><ChoixFichier accept=".xlsx,.xls" fichiers={fichiers} onChange={(l) => { setFichiers(l); if (l[0]) importer(l[0]); }} texte="📥 Importer le fichier rempli" /></div>
      </div>

      {msg && <p className="text-sm font-semibold" style={{ color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.t}</p>}
      {rejets.length > 0 && (
        <ul className="text-xs text-red-700 list-disc pl-5">{rejets.slice(0, 20).map((r) => <li key={r.ligne}>Ligne {r.ligne} ({r.nom || "—"}) : {r.erreur}</li>)}</ul>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left bg-gray-50">
            <tr><th className="p-2">Salarié</th><th className="p-2 text-right">Reste à prendre</th><th className="p-2 text-right">Acquis en cours</th><th className="p-2">Solde actuel enregistré</th></tr>
          </thead>
          <tbody>
            {liste.map((s) => {
              const v = valeurs[s.id] ?? { reste: "", enCours: "" };
              return (
                <tr key={s.id} className="border-t">
                  <td className="p-2"><span className="font-semibold">{s.prenom} {s.nom}</span>{s.matricule && <span className="text-xs text-gray-400"> · {s.matricule}</span>}</td>
                  <td className="p-2 text-right"><input inputMode="decimal" value={v.reste} onChange={(e) => setValeurs({ ...valeurs, [s.id]: { ...v, reste: e.target.value } })} className={champ} aria-label={`Reste à prendre ${s.prenom} ${s.nom}`} /> j</td>
                  <td className="p-2 text-right"><input inputMode="decimal" value={v.enCours} onChange={(e) => setValeurs({ ...valeurs, [s.id]: { ...v, enCours: e.target.value } })} className={champ} aria-label={`Acquis en cours ${s.prenom} ${s.nom}`} /> j</td>
                  <td className="p-2 text-xs text-gray-500">{s.congesRepriseDate ? `au ${fr(s.congesRepriseDate)} : ${s.congesRepriseReste ?? 0} j à prendre · ${s.congesRepriseEnCours ?? 0} j en cours` : "aucun (calcul complet depuis les absences et relevés)"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <button type="button" onClick={enregistrer} disabled={envoi} className="bg-orange-500 text-white rounded-lg px-5 py-2 font-semibold disabled:opacity-50">{envoi ? "Enregistrement…" : "💾 Enregistrer les soldes"}</button>
        <p className="text-xs text-gray-500">Laissez les deux cases vides pour revenir au calcul complet. Les congés pris après la date de reprise sont déduits automatiquement.</p>
      </div>
    </div>
  );
}
