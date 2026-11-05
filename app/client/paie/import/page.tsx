"use client";

import { useState } from "react";
import CadreClient from "@/components/CadreClient";
import { NOMS_MOIS } from "@/lib/heures";

type Apercu = { ligne: number; salarie: string; type?: string; valeur: number; commentaire: string | null; erreur: string | null };
const COLONNES = ["matricule", "nom", "prenom", "type", "valeur", "commentaire"];
const LIB_TYPE: Record<string, string> = { HEURE_SUPPLEMENTAIRE: "Heures supp.", PRIME: "Prime", NOTE_FRAIS: "Note de frais", ACOMPTE: "Acompte" };

/** Paie › Importer en masse : un fichier Excel/CSV ou un copier-coller, contrôlé avant l'import */
export default function ImportVariables() {
  const now = new Date();
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());
  const [lignes, setLignes] = useState<Record<string, unknown>[]>([]);
  const [texte, setTexte] = useState("");
  const [apercu, setApercu] = useState<Apercu[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [occupe, setOccupe] = useState(false);

  const cle = (k: string) => k.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
  function normaliser(brut: Record<string, unknown>[]) {
    return brut.map((r) => {
      const o: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) {
        const c = cle(k);
        const nom = COLONNES.find((x) => c.startsWith(x)) || (c.includes("montant") || c.includes("quantite") ? "valeur" : c.includes("salarie") ? "nom" : null);
        if (nom) o[nom] = v;
      }
      return o;
    }).filter((o) => Object.keys(o).length > 0);
  }

  async function lireFichier(f: File) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await f.arrayBuffer());
    const brut = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    const l = normaliser(brut);
    setLignes(l); setApercu(null); setMsg({ ok: true, t: `${l.length} ligne(s) lue(s) dans ${f.name}` });
  }
  function lireTexte() {
    const rangs = texte.trim().split(/\r?\n/).map((r) => r.split(/\t|;/));
    if (rangs.length < 2) { setMsg({ ok: false, t: "Collez la ligne d'en-têtes puis au moins une ligne." }); return; }
    const entetes = rangs[0];
    const l = normaliser(rangs.slice(1).map((r) => Object.fromEntries(entetes.map((h, i) => [h, r[i] ?? ""]))));
    setLignes(l); setApercu(null); setMsg({ ok: true, t: `${l.length} ligne(s) lue(s)` });
  }
  async function modele() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([["Matricule", "Nom", "Prénom", "Type", "Valeur", "Commentaire"], ["001", "DUPONT", "Marie", "HS", 4, "Inventaire"], ["", "MARTIN", "Paul", "PRIME", 150, "Prime exceptionnelle"]]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Variables");
    XLSX.writeFile(wb, "modele-import-variables.xlsx");
  }
  async function envoyer(valider: boolean) {
    setOccupe(true);
    const res = await fetch("/api/paie/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mois, annee, lignes, valider }) });
    const d = await res.json().catch(() => ({}));
    setOccupe(false);
    if (!res.ok) { setMsg({ ok: false, t: d.erreur || "Erreur" }); return; }
    if (valider) { setMsg({ ok: true, t: `✅ ${d.importees} variable(s) importée(s)${d.ignorees ? `, ${d.ignorees} ligne(s) en erreur ignorée(s)` : ""}.` }); setLignes([]); setApercu(null); setTexte(""); }
    else setApercu(d.apercu);
  }
  const nbErreurs = apercu?.filter((a) => a.erreur).length ?? 0;

  return (
    <CadreClient>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">📥 Importer des variables en masse</h1>
        <p className="text-gray-500 mt-1">Colonnes attendues : Matricule (ou Nom + Prénom), Type (HS, PRIME, FRAIS, ACOMPTE), Valeur, Commentaire. Les heures supp. sont en heures, le reste en euros.</p>
        <div className="flex gap-2 flex-wrap mt-4 items-center">
          <select value={mois} onChange={(e) => setMois(Number(e.target.value))} className="border rounded-lg px-3 py-2" aria-label="Mois">{NOMS_MOIS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
          <input type="number" value={annee} onChange={(e) => setAnnee(Number(e.target.value))} className="border rounded-lg px-3 py-2 w-28" aria-label="Année" />
          <button type="button" onClick={modele} className="border rounded-lg px-3 py-2 font-semibold">📄 Télécharger le modèle Excel</button>
        </div>
      </div>
      <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-3">
          <h2 className="font-bold">1. Depuis un fichier (Excel ou CSV)</h2>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && lireFichier(e.target.files[0])} />
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-3">
          <h2 className="font-bold">… ou par copier-coller depuis Excel</h2>
          <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={5} placeholder={"Matricule\tNom\tPrénom\tType\tValeur\tCommentaire\n001\tDUPONT\tMarie\tHS\t4\tInventaire"} className="border rounded-lg p-3 font-mono text-xs" aria-label="Copier-coller" />
          <button type="button" onClick={lireTexte} disabled={!texte.trim()} className="bg-black text-white rounded-lg px-4 py-2 font-semibold self-start">Lire le collage</button>
        </div>
      </div>
      {msg && <p className="font-semibold" style={{ color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.t}</p>}
      {lignes.length > 0 && !apercu && <button type="button" disabled={occupe} onClick={() => envoyer(false)} className="bg-orange-500 text-white rounded-lg px-5 py-3 font-bold self-start">2. Contrôler les {lignes.length} ligne(s)</button>}
      {apercu && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <div className="p-4 flex justify-between items-center gap-3 flex-wrap">
            <p className="font-semibold">{apercu.length - nbErreurs} ligne(s) prête(s){nbErreurs ? `, ${nbErreurs} en erreur (ignorées)` : ""} — {NOMS_MOIS[mois - 1]} {annee}</p>
            <button type="button" disabled={occupe || apercu.length === nbErreurs} onClick={() => envoyer(true)} className="bg-green-600 text-white rounded-lg px-5 py-2 font-bold">3. Importer</button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left"><tr><th className="p-2">Ligne</th><th className="p-2">Salarié</th><th className="p-2">Type</th><th className="p-2">Valeur</th><th className="p-2">Commentaire</th><th className="p-2">Contrôle</th></tr></thead>
            <tbody>{apercu.map((a) => (
              <tr key={a.ligne} className="border-t" style={{ background: a.erreur ? "#fef2f2" : undefined }}>
                <td className="p-2">{a.ligne}</td><td className="p-2">{a.salarie}</td><td className="p-2">{a.type ? LIB_TYPE[a.type] : "—"}</td><td className="p-2">{Number.isFinite(a.valeur) ? a.valeur : "—"}</td><td className="p-2">{a.commentaire}</td>
                <td className="p-2 font-semibold" style={{ color: a.erreur ? "#b91c1c" : "#15803d" }}>{a.erreur || "OK"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </CadreClient>
  );
}
