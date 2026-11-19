"use client";

import { useEffect, useRef, useState } from "react";
import { champsDuTexte, MODELES_INTEGRES } from "@/lib/contrats";

type Modele = { id: string; nom: string; champs: string[]; taille: number; createdAt: string };

async function champsDuModele(f: File): Promise<string[]> {
  const PizZip = (await import("pizzip")).default;
  const Docxtemplater = (await import("docxtemplater")).default;
  const doc = new Docxtemplater(new PizZip(await f.arrayBuffer()), { paragraphLoop: true, linebreaks: true, delimiters: { start: "{{", end: "}}" }, nullGetter: () => "" });
  return champsDuTexte(doc.getFullText());
}

/** Admin : modèles de contrat FRANEO RH déposés pour tous les clients (ajout, remplacement, suppression) */
export default function ModelesContratsAdmin() {
  const [liste, setListe] = useState<Modele[]>([]);
  const [nom, setNom] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; t: string } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);
  const remplacer = useRef<{ id: string } | null>(null);

  const charger = () => fetch("/api/admin/modeles-contrats").then((r) => r.json()).then((d) => Array.isArray(d) && setListe(d)).catch(() => {});
  useEffect(() => { charger(); }, []);

  async function envoyer(f: File, remplace?: string) {
    setMessage(null); setOccupe(true);
    try {
      if (!/\.docx$/i.test(f.name)) throw new Error("Le modèle doit être un fichier Word .docx.");
      const champs = await champsDuModele(f);
      if (champs.length === 0) throw new Error("Aucun champ {{…}} trouvé : écrivez par exemple {{nom}} ou {{date_debut}} à l'endroit à compléter.");
      const fd = new FormData();
      fd.append("fichier", f);
      fd.append("nom", remplace ? liste.find((m) => m.id === remplace)?.nom ?? f.name : nom.trim() || f.name.replace(/\.docx$/i, ""));
      fd.append("champs", JSON.stringify(champs));
      if (remplace) fd.append("remplace", remplace);
      const res = await fetch("/api/admin/modeles-contrats", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.erreur || "Envoi impossible");
      setMessage({ ok: true, t: `✅ Modèle ${remplace ? "remplacé" : "ajouté"} : ${champs.length} champ(s) détecté(s). Il est proposé à tous les clients ayant les contrats.` });
      setNom("");
      charger();
    } catch (e) {
      setMessage({ ok: false, t: e instanceof Error ? e.message : "Modèle illisible." });
    }
    setOccupe(false);
  }

  async function supprimer(m: Modele) {
    if (!confirm(`Supprimer le modèle « ${m.nom} » pour tous les clients ?`)) return;
    await fetch(`/api/contrats/trames/${m.id}`, { method: "DELETE" });
    charger();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-3">
        <h2 className="text-lg font-bold">➕ Ajouter un modèle de contrat</h2>
        <p className="text-sm text-gray-500">Fichier Word .docx avec des champs entre accolades, par exemple <code>{"{{nom}}"}</code>, <code>{"{{date_debut}}"}</code>, <code>{"{{salaire_brut}}"}</code>. Le modèle apparaît chez tous les clients dans Gestion RH › Contrats, avec les modèles FRANEO RH.</p>
        <div className="flex gap-2 flex-wrap">
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom affiché (ex. CDI cadre Syntec)" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" style={{ minWidth: 220 }} />
          <button type="button" disabled={occupe} onClick={() => { remplacer.current = null; fichier.current?.click(); }} className="bg-orange-500 text-white rounded-lg px-4 py-2 font-semibold text-sm disabled:opacity-50">{occupe ? "Envoi…" : "📤 Choisir le fichier .docx"}</button>
        </div>
        <input ref={fichier} type="file" accept=".docx" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) envoyer(f, remplacer.current?.id); }} />
        {message && <p className="text-sm" style={{ color: message.ok ? "#15803d" : "#b91c1c" }}>{message.t}</p>}
      </div>

      <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-2">
        <h2 className="text-lg font-bold">📄 Modèles déposés ({liste.length})</h2>
        {liste.length === 0 && <p className="text-sm text-gray-500">Aucun modèle déposé pour l&apos;instant.</p>}
        {liste.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 flex-wrap border-b last:border-0 py-2">
            <div className="min-w-0">
              <p className="font-semibold">{m.nom}</p>
              <p className="text-xs text-gray-500">{m.champs.length} champ(s) · mis à jour le {new Date(m.createdAt).toLocaleDateString("fr-FR")}</p>
            </div>
            <div className="flex gap-3 text-sm font-semibold">
              <a href={`/api/contrats/trames/${m.id}`} className="text-gray-700 hover:underline">⬇️ Télécharger</a>
              <button type="button" disabled={occupe} onClick={() => { remplacer.current = { id: m.id }; fichier.current?.click(); }} className="text-orange-600 hover:underline">🔄 Remplacer</button>
              <button type="button" onClick={() => supprimer(m)} className="text-red-600 hover:underline">🗑️ Supprimer</button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold mb-2">📘 Modèles intégrés à l&apos;application ({MODELES_INTEGRES.length})</h2>
        <p className="text-sm text-gray-500 mb-2">Toujours proposés aux clients (fichiers du dossier <code>public/modeles</code>). Pour en changer un, téléchargez-le, modifiez-le dans Word puis déposez-le ci-dessus sous le même nom.</p>
        <ul className="text-sm grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {MODELES_INTEGRES.map((m) => <li key={m.id}><a href={m.url} className="hover:underline">📘 {m.nom}</a></li>)}
        </ul>
      </div>
    </div>
  );
}
