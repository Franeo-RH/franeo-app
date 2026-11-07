"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CHAMPS_CONTRAT, champsDuTexte, formaterValeur, GROUPES_CONTRAT, libelleChamp, type ChampContrat } from "@/lib/contrats";

type Trame = { id: string; nom: string; champs: string[]; taille: number; createdAt: string };
type Historique = { id: string; intitule: string; typeContrat: string; trameNom: string | null; auteur: string; verification: boolean; createdAt: string };
type S = { id: string; prenom: string; nom: string };

const MODELE_FRANEO = { id: "_franeo", nom: "Modèle FRANEO RH (exemple CDI / CDD)", url: "/modeles/modele-contrat-franeo.docx" };
const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const iso = (d?: string | null) => (d ? String(d).slice(0, 10) : "");

async function ouvrirModele(buffer: ArrayBuffer) {
  const PizZip = (await import("pizzip")).default;
  const Docxtemplater = (await import("docxtemplater")).default;
  const zip = new PizZip(buffer);
  return new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, delimiters: { start: "{{", end: "}}" }, nullGetter: () => "" });
}
function messageErreur(e: unknown) {
  const err = e as { properties?: { errors?: { properties?: { explanation?: string } }[] }; message?: string };
  const detail = err?.properties?.errors?.map((x) => x.properties?.explanation).filter(Boolean).slice(0, 3).join(" ; ");
  return detail || err?.message || "Modèle illisible.";
}

/** Gestion RH › Contrats : modèles Word avec des champs {{…}}, remplis automatiquement (publipostage) */
export default function ContratsClient() {
  const [etape, setEtape] = useState<"modele" | "infos" | "fini">("modele");
  const [trames, setTrames] = useState<Trame[]>([]);
  const [historique, setHistorique] = useState<Historique[]>([]);
  const [salaries, setSalaries] = useState<S[]>([]);
  const [modele, setModele] = useState<{ id: string; nom: string; champs: string[]; buffer: ArrayBuffer } | null>(null);
  const [salarieId, setSalarieId] = useState("");
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [verification, setVerification] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [aide, setAide] = useState(false);

  const charger = useCallback(async () => {
    const [t, h, s] = await Promise.all([
      fetch("/api/contrats/trames").then((r) => r.json()).catch(() => []),
      fetch("/api/contrats").then((r) => r.json()).catch(() => []),
      fetch("/api/salaries").then((r) => r.json()).catch(() => []),
    ]);
    setTrames(Array.isArray(t) ? t : []);
    setHistorique(Array.isArray(h) ? h : []);
    setSalaries(Array.isArray(s) ? (s as S[]).sort((a, b) => a.nom.localeCompare(b.nom)) : []);
  }, []);
  useEffect(() => { charger(); }, [charger]);

  // Infos de l'entreprise pré-remplies
  const preRemplir = useCallback(async (sid: string) => {
    const [e, s] = await Promise.all([
      fetch("/api/entreprises/moi").then((r) => r.json()).catch(() => null),
      sid ? fetch(`/api/salaries/${sid}`).then((r) => r.json()).catch(() => null) : Promise.resolve(null),
    ]);
    const v: Record<string, string> = {
      societe: e?.nom || "", siret_societe: e?.siret || "", ccn: e?.ccn || "",
      adresse_societe: [e?.rue, [e?.codePostal, e?.ville].filter(Boolean).join(" ")].filter(Boolean).join(", "),
      date_signature: new Date().toISOString().slice(0, 10), lieu_signature: e?.ville || "",
      type_contrat: "INDÉTERMINÉE",
    };
    if (s && !s.erreur) {
      Object.assign(v, {
        prenom: s.prenom || "", nom: s.nom || "", date_naissance: iso(s.dateNaissance), lieu_naissance: s.lieuNaissance || "",
        nationalite: s.nationalite || "", numero_ss: s.numeroSecuriteSociale || "",
        adresse_salarie: [s.rue, [s.codePostal, s.ville].filter(Boolean).join(" ")].filter(Boolean).join(", "),
        poste: s.poste || "", coefficient: s.coefficient || "", position: s.position || "",
        date_debut: iso(s.dateDebut), date_fin: iso(s.dateFin), duree_hebdo: s.heuresHebdomadaires != null ? String(s.heuresHebdomadaires) : "",
        salaire_brut_mensuel: s.salaireMensuel != null ? String(s.salaireMensuel) : "", salaire_brut_annuel: s.salaireAnnuel != null ? String(s.salaireAnnuel) : "",
        lieu_travail: s.etablissement || "", manager: s.manager || "", avantages: s.avantages || "",
        type_contrat: s.typeContrat === "CDD" ? "DÉTERMINÉE" : "INDÉTERMINÉE",
      });
    }
    setValeurs(v);
  }, []);

  async function choisirModele(id: string) {
    setMsg(null); setOccupe(true);
    try {
      const url = id === MODELE_FRANEO.id ? MODELE_FRANEO.url : `/api/contrats/trames/${id}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("Modèle introuvable");
      const buffer = await r.arrayBuffer();
      const doc = await ouvrirModele(buffer);
      const champs = champsDuTexte(doc.getFullText());
      const nom = id === MODELE_FRANEO.id ? MODELE_FRANEO.nom : trames.find((t) => t.id === id)?.nom || "Modèle";
      setModele({ id, nom, champs, buffer });
      await preRemplir(salarieId);
      setEtape("infos");
    } catch (e) {
      setMsg({ ok: false, t: `Impossible de lire ce modèle : ${messageErreur(e)}` });
    }
    setOccupe(false);
  }

  async function deposerModele(f: File) {
    setMsg(null); setOccupe(true);
    try {
      if (!/\.docx$/i.test(f.name)) throw new Error("Le modèle doit être un fichier Word .docx (Fichier › Enregistrer sous › Document Word).");
      const doc = await ouvrirModele(await f.arrayBuffer());
      const champs = champsDuTexte(doc.getFullText());
      if (champs.length === 0) throw new Error("Aucun champ {{…}} trouvé : écrivez par exemple {{nom}} ou {{date_debut}} à l'endroit à compléter.");
      const fd = new FormData(); fd.append("fichier", f); fd.append("nom", f.name.replace(/\.docx$/i, "")); fd.append("champs", JSON.stringify(champs));
      const res = await fetch("/api/contrats/trames", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.erreur || "Envoi impossible");
      setMsg({ ok: true, t: `✅ Modèle enregistré : ${champs.length} champ(s) détecté(s).` });
      charger();
    } catch (e) {
      setMsg({ ok: false, t: messageErreur(e) });
    }
    setOccupe(false);
  }

  // Champs à afficher : ceux du modèle, rangés par groupe ; les champs inconnus vont dans « Autres champs du modèle »
  const groupes = useMemo(() => {
    const g: Record<string, ChampContrat[]> = {};
    for (const cle of modele?.champs || []) {
      const c = CHAMPS_CONTRAT.find((x) => x.cle === cle) ?? { cle, label: libelleChamp(cle), groupe: "Autres champs du modèle" };
      (g[c.groupe] ||= []).push(c);
    }
    return GROUPES_CONTRAT.filter((x) => g[x]).map((x) => ({ titre: x, champs: g[x] }));
  }, [modele]);
  const manquants = (modele?.champs || []).filter((c) => !valeurs[c]?.trim());

  async function generer() {
    if (!modele) return;
    setOccupe(true); setMsg(null);
    try {
      const doc = await ouvrirModele(modele.buffer.slice(0));
      const donnees: Record<string, string> = {};
      for (const c of modele.champs) donnees[c] = formaterValeur(CHAMPS_CONTRAT.find((x) => x.cle === c), valeurs[c] || "");
      doc.render(donnees);
      const blob: Blob = doc.getZip().generate({ type: "blob", mimeType: MIME_DOCX });
      const nomFichier = `Contrat ${valeurs.prenom || ""} ${valeurs.nom || ""}`.replace(/\s+/g, " ").trim() || "Contrat";
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${nomFichier}.docx`; a.click();
      await fetch("/api/contrats", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salarieId, trameNom: modele.nom, typeContrat: valeurs.type_contrat === "DÉTERMINÉE" ? "CDD" : valeurs.type_contrat ? "CDI" : "Contrat", intitule: `${nomFichier}${valeurs.poste ? ` — ${valeurs.poste}` : ""}`, donnees, verification }),
      });
      setEtape("fini");
      charger();
    } catch (e) {
      setMsg({ ok: false, t: `Génération impossible : ${messageErreur(e)}` });
    }
    setOccupe(false);
  }

  const carte = "bg-white rounded-xl shadow p-6";
  const etapes = [["modele", "1. Modèle"], ["infos", "2. Informations"], ["fini", "3. Contrat"]] as const;

  return (
    <div className="flex flex-col gap-6">
      <div className={carte}>
        <h1 className="text-3xl font-bold">📝 Contrats de travail</h1>
        <p className="text-gray-500 mt-1">Choisissez un modèle, complétez uniquement les informations demandées : le contrat Word est rempli automatiquement, prêt à relire et à signer.</p>
        <div className="flex gap-2 mt-4 flex-wrap">
          {etapes.map(([id, l]) => <span key={id} className={`px-3 py-1 rounded-full text-sm font-semibold ${etape === id ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-500"}`}>{l}</span>)}
        </div>
      </div>

      {msg && <p className="font-semibold" style={{ color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.t}</p>}

      {etape === "modele" && (
        <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          <div className={`${carte} flex flex-col gap-3`}>
            <h2 className="text-lg font-bold">Pour qui ?</h2>
            <select value={salarieId} onChange={(e) => setSalarieId(e.target.value)} className="border rounded-lg px-3 py-2" aria-label="Salarié">
              <option value="">Nouvelle embauche (je saisis tout)</option>
              {salaries.map((s) => <option key={s.id} value={s.id}>{s.nom} {s.prenom}</option>)}
            </select>
            <p className="text-xs text-gray-500">Avec un salarié existant, sa fiche pré-remplit le contrat.</p>
            <h2 className="text-lg font-bold mt-2">Choisir un modèle</h2>
            <button type="button" disabled={occupe} onClick={() => choisirModele(MODELE_FRANEO.id)} className="text-left border-2 border-orange-200 rounded-lg p-3 hover:bg-orange-50">
              <strong>⭐ {MODELE_FRANEO.nom}</strong><span className="block text-xs text-gray-500">Base proposée par FRANEO RH, à adapter à votre situation.</span>
            </button>
            {trames.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <button type="button" disabled={occupe} onClick={() => choisirModele(t.id)} className="flex-1 text-left border rounded-lg p-3 hover:bg-orange-50">
                  <strong>📄 {t.nom}</strong><span className="block text-xs text-gray-500">{t.champs.length} champ(s) · ajouté le {new Date(t.createdAt).toLocaleDateString("fr-FR")}</span>
                </button>
                <button type="button" aria-label={`Supprimer ${t.nom}`} onClick={async () => { if (confirm("Supprimer ce modèle ?")) { await fetch(`/api/contrats/trames/${t.id}`, { method: "DELETE" }); charger(); } }} className="text-red-600">🗑️</button>
              </div>
            ))}
          </div>

          <div className={`${carte} flex flex-col gap-3`}>
            <h2 className="text-lg font-bold">➕ Importer mon modèle Word</h2>
            <input type="file" accept=".docx" disabled={occupe} onChange={(e) => { const f = e.target.files?.[0]; if (f) deposerModele(f); e.target.value = ""; }} aria-label="Modèle Word" />
            <button type="button" onClick={() => setAide(!aide)} className="text-sm text-orange-600 font-semibold text-left">{aide ? "▾" : "▸"} Comment préparer mon modèle ?</button>
            {aide && (
              <div className="text-sm text-gray-700 flex flex-col gap-2">
                <p>1. Ouvrez votre contrat habituel dans Word.</p>
                <p>2. Remplacez chaque information qui change par un champ entre doubles accolades, par exemple : <code className="bg-gray-100 px-1">{"{{prenom}}"}</code>, <code className="bg-gray-100 px-1">{"{{date_debut}}"}</code>, <code className="bg-gray-100 px-1">{"{{salaire_brut_mensuel}}"}</code>.</p>
                <p>3. Enregistrez en .docx et importez-le ici. Vous pouvez inventer vos propres champs (ex. <code className="bg-gray-100 px-1">{"{{prime_objectifs}}"}</code>) : ils apparaîtront dans le formulaire.</p>
                <p>4. Le plus simple : <a href={MODELE_FRANEO.url} download className="text-orange-600 font-semibold underline">téléchargez le modèle FRANEO RH</a>, modifiez le texte autour des champs, puis importez-le.</p>
                <details><summary className="cursor-pointer font-semibold">Champs reconnus automatiquement</summary>
                  <ul className="mt-2 text-xs columns-2">{CHAMPS_CONTRAT.map((c) => <li key={c.cle}><code>{`{{${c.cle}}}`}</code> {c.label}</li>)}</ul>
                </details>
              </div>
            )}
          </div>
        </div>
      )}

      {etape === "infos" && modele && (
        <div className="flex flex-col gap-4">
          <div className={`${carte} flex justify-between items-center gap-3 flex-wrap`}>
            <p><strong>Modèle :</strong> {modele.nom} · {modele.champs.length} information(s) à compléter</p>
            <button type="button" onClick={() => setEtape("modele")} className="border px-4 py-2 rounded-lg">← Changer de modèle</button>
          </div>
          {groupes.map((g) => (
            <div key={g.titre} className={carte}>
              <h2 className="text-lg font-bold mb-3">{g.titre}</h2>
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
                {g.champs.map((c) => (
                  <label key={c.cle} className="text-sm font-semibold">{c.label}
                    {c.type === "liste" ? (
                      <select value={valeurs[c.cle] || ""} onChange={(e) => setValeurs({ ...valeurs, [c.cle]: e.target.value })} className="border rounded-lg px-3 py-2 w-full mt-1 font-normal">
                        <option value="">—</option>{c.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input type={c.type === "date" ? "date" : "text"} inputMode={c.type === "nombre" ? "decimal" : undefined} value={valeurs[c.cle] || ""} onChange={(e) => setValeurs({ ...valeurs, [c.cle]: e.target.value })} className="border rounded-lg px-3 py-2 w-full mt-1 font-normal" />
                    )}
                    {c.aide && <span className="block text-xs text-gray-400 font-normal mt-1">{c.aide}</span>}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className={`${carte} flex flex-col gap-3`}>
            {manquants.length > 0 && <p className="text-sm text-orange-600">⚠️ {manquants.length} information(s) vide(s) : elles resteront en blanc dans le contrat ({manquants.slice(0, 6).map(libelleChamp).join(", ")}{manquants.length > 6 ? "…" : ""}).</p>}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={verification} onChange={(e) => setVerification(e.target.checked)} /> Demander une relecture par FRANEO RH</label>
            <button type="button" disabled={occupe} onClick={generer} className="bg-orange-500 text-white px-6 py-3 rounded-lg font-bold self-start">{occupe ? "Génération…" : "📄 Générer le contrat Word"}</button>
          </div>
        </div>
      )}

      {etape === "fini" && (
        <div className={`${carte} flex flex-col gap-3`}>
          <p className="text-xl font-bold">✅ Contrat généré et téléchargé</p>
          <p className="text-gray-600">Relisez-le dans Word avant signature. Pensez à le déposer ensuite dans Gestion RH › Documents (type « Contrat de travail »).</p>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={generer} className="border px-4 py-2 rounded-lg">⬇️ Le télécharger à nouveau</button>
            <button type="button" onClick={() => { setEtape("modele"); setModele(null); setMsg(null); }} className="bg-black text-white px-4 py-2 rounded-lg font-semibold">➕ Nouveau contrat</button>
          </div>
        </div>
      )}

      <div className={carte}>
        <h2 className="text-lg font-bold mb-3">📋 Contrats générés</h2>
        {historique.length === 0 ? <p className="text-gray-500 text-sm">Aucun contrat généré pour l&apos;instant.</p> : (
          <ul className="flex flex-col divide-y text-sm">
            {historique.map((h) => (
              <li key={h.id} className="py-2 flex justify-between gap-3 flex-wrap">
                <span><strong>{h.intitule}</strong> <span className="text-gray-500">· {h.typeContrat} · {h.trameNom} · {new Date(h.createdAt).toLocaleDateString("fr-FR")} · {h.auteur}</span></span>
                {h.verification && <span className="text-xs font-semibold text-blue-700">🔎 relecture demandée</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
