"use client";

import { useEffect, useState } from "react";
import { MOIS_FR, salarieDuFichier } from "@/lib/bulletins";

type Sal = { id: string; prenom: string; nom: string; matricule: string | null; espace: boolean };
type Dep = { id: string; salarieId: string; nom: string; vuLe: string | null };
type Ligne = { fichier: File; salarieId: string; etat?: "ok" | "erreur"; message?: string };

/** Admin › Paie › Bulletins : déposer les PDF du mois, l'app les répartit par salarié et prévient chacun */
export default function BulletinsAdmin() {
  const maintenant = new Date();
  const [entreprises, setEntreprises] = useState<{ id: string; nom: string }[]>([]);
  const [entrepriseId, setEntrepriseId] = useState("");
  const [mois, setMois] = useState(maintenant.getMonth() + 1);
  const [annee, setAnnee] = useState(maintenant.getFullYear());
  const [salaries, setSalaries] = useState<Sal[]>([]);
  const [deposes, setDeposes] = useState<Dep[]>([]);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [prevenir, setPrevenir] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { fetch("/api/entreprises").then((r) => r.json()).then((d) => Array.isArray(d) && setEntreprises(d.filter((e: { demo?: boolean }) => !e.demo))).catch(() => {}); }, []);
  const charger = () => {
    if (!entrepriseId) { setSalaries([]); setDeposes([]); return; }
    fetch(`/api/admin/bulletins?entrepriseId=${entrepriseId}&mois=${mois}&annee=${annee}`).then((r) => r.json()).then((d) => { setSalaries(d.salaries ?? []); setDeposes(d.bulletins ?? []); }).catch(() => {});
  };
  useEffect(charger, [entrepriseId, mois, annee]); // eslint-disable-line react-hooks/exhaustive-deps

  function ajouterFichiers(liste: FileList | null) {
    if (!liste) return;
    const nouvelles = [...liste].filter((f) => /\.pdf$/i.test(f.name)).map((f) => ({ fichier: f, salarieId: salarieDuFichier(f.name, salaries)?.id ?? "" }));
    setLignes((l) => [...l, ...nouvelles]);
  }

  async function envoyer() {
    setEnvoi(true); setMessage("");
    const ok: string[] = [];
    const maj = [...lignes];
    for (let i = 0; i < maj.length; i++) {
      if (maj[i].etat === "ok") continue;
      if (!maj[i].salarieId) { maj[i] = { ...maj[i], etat: "erreur", message: "Choisissez le salarié" }; continue; }
      const fd = new FormData();
      fd.append("entrepriseId", entrepriseId); fd.append("mois", String(mois)); fd.append("annee", String(annee)); fd.append("prevenir", "0");
      fd.append("fichier_0", maj[i].fichier); fd.append("salarie_0", maj[i].salarieId);
      const r = await fetch("/api/admin/bulletins", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.deposes === 1) { maj[i] = { ...maj[i], etat: "ok" }; ok.push(maj[i].salarieId); }
      else maj[i] = { ...maj[i], etat: "erreur", message: d.erreurs?.[0] || d.erreur || "Envoi impossible" };
      setLignes([...maj]);
    }
    let mails = 0;
    if (prevenir && ok.length) {
      const r = await fetch("/api/admin/bulletins", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entrepriseId, mois, annee, salarieIds: ok }) });
      mails = (await r.json().catch(() => ({}))).mails ?? 0;
    }
    setEnvoi(false);
    setMessage(`✅ ${ok.length} bulletin(s) déposé(s)${prevenir ? ` · ${mails} salarié(s) prévenu(s) par e-mail, l'employeur aussi` : ""}.`);
    setLignes(maj.filter((l) => l.etat !== "ok"));
    charger();
  }

  const nomSal = (id: string) => { const s = salaries.find((x) => x.id === id); return s ? `${s.prenom} ${s.nom}` : "—"; };
  const sansBulletin = salaries.filter((s) => !deposes.some((d) => d.salarieId === s.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-xl shadow p-6 flex gap-3 flex-wrap items-end">
        <label className="text-sm font-semibold flex-1" style={{ minWidth: 220 }}>Entreprise
          <select className="w-full border rounded-lg px-3 py-2 mt-1 font-normal" value={entrepriseId} onChange={(e) => { setEntrepriseId(e.target.value); setLignes([]); }}>
            <option value="">Choisir…</option>
            {entreprises.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Mois
          <select className="w-full border rounded-lg px-3 py-2 mt-1 font-normal" value={mois} onChange={(e) => setMois(Number(e.target.value))}>
            {MOIS_FR.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Année
          <input type="number" className="w-28 border rounded-lg px-3 py-2 mt-1 font-normal block" value={annee} onChange={(e) => setAnnee(Number(e.target.value))} />
        </label>
      </div>

      {entrepriseId && (
        <>
          <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
            <h2 className="text-lg font-bold">📤 Déposer les bulletins de {MOIS_FR[mois - 1]} {annee}</h2>
            <label className="border-2 border-dashed border-orange-300 rounded-xl p-6 text-center cursor-pointer hover:bg-orange-50"
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); ajouterFichiers(e.dataTransfer.files); }}>
              <input type="file" accept=".pdf" multiple hidden onChange={(e) => { ajouterFichiers(e.target.files); e.target.value = ""; }} />
              <p className="font-semibold">Glissez les PDF ici, ou cliquez pour les choisir</p>
              <p className="text-sm text-gray-500">Un PDF par salarié (4 Mo max). Le salarié est reconnu par son matricule ou ses nom et prénom dans le nom du fichier.</p>
            </label>
            {lignes.length > 0 && (
              <table className="w-full text-sm text-left">
                <thead><tr className="text-gray-500 border-b"><th className="pb-2">Fichier</th><th className="pb-2">Salarié</th><th className="pb-2">État</th><th /></tr></thead>
                <tbody>
                  {lignes.map((l, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td data-label="Fichier" className="py-2">{l.fichier.name}</td>
                      <td data-label="Salarié" className="py-2">
                        <select className="border rounded-lg px-2 py-1" value={l.salarieId} onChange={(e) => setLignes(lignes.map((x, j) => (j === i ? { ...x, salarieId: e.target.value, etat: undefined } : x)))}>
                          <option value="">⚠️ Choisir le salarié</option>
                          {salaries.map((s) => <option key={s.id} value={s.id}>{s.prenom} {s.nom}{s.matricule ? ` (${s.matricule})` : ""}{deposes.some((d) => d.salarieId === s.id) ? " — remplacera l'actuel" : ""}</option>)}
                        </select>
                      </td>
                      <td data-label="État" className="py-2">{l.etat === "erreur" ? <span className="text-red-600">❌ {l.message}</span> : l.salarieId ? "Prêt" : <span className="text-orange-600">À relier</span>}</td>
                      <td data-label="" className="py-2 text-right"><button type="button" onClick={() => setLignes(lignes.filter((_, j) => j !== i))} className="text-red-600">🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={prevenir} onChange={(e) => setPrevenir(e.target.checked)} /> Prévenir par e-mail les salariés (qui ont leur espace) et l&apos;employeur</label>
              <button type="button" disabled={envoi || lignes.length === 0} onClick={envoyer} className="bg-orange-500 text-white rounded-lg px-5 py-2 font-semibold disabled:opacity-50 ml-auto">{envoi ? "Envoi…" : `Déposer ${lignes.length} bulletin(s)`}</button>
            </div>
            {message && <p className="text-sm font-semibold">{message}</p>}
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-bold mb-3">📄 Déposés pour {MOIS_FR[mois - 1]} {annee} ({deposes.length}/{salaries.length})</h2>
            {deposes.length === 0 ? <p className="text-sm text-gray-500">Aucun bulletin pour ce mois.</p> : (
              <ul className="flex flex-col text-sm">
                {deposes.map((d) => (
                  <li key={d.id} className="flex justify-between gap-3 py-2 border-b last:border-0">
                    <a href={`/api/bulletins/${d.id}`} target="_blank" rel="noreferrer" className="font-semibold hover:text-orange-600">{nomSal(d.salarieId)}</a>
                    <span className="flex gap-3 items-center">
                      <span className={d.vuLe ? "text-green-700" : "text-gray-400"}>{d.vuLe ? `👁️ vu le ${new Date(d.vuLe).toLocaleDateString("fr-FR")}` : "pas encore ouvert"}</span>
                      <button type="button" onClick={async () => { if (confirm("Supprimer ce bulletin ?")) { await fetch(`/api/bulletins/${d.id}`, { method: "DELETE" }); charger(); } }} className="text-red-600">🗑️</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {sansBulletin.length > 0 && deposes.length > 0 && <p className="text-xs text-orange-700 mt-3">Sans bulletin : {sansBulletin.map((s) => `${s.prenom} ${s.nom}`).join(", ")}</p>}
          </div>
        </>
      )}
    </div>
  );
}
