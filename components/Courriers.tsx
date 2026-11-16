"use client";

// Courriers et e-mails types : choisir un modèle et un salarié, compléter les cases, puis imprimer (PDF),
// copier ou envoyer par e-mail. Le client peut aussi créer ses propres modèles ; FRANEO RH (admin)
// ajoute des modèles proposés à tous les clients.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORIES, champsLibres, estFacultatif, remplir, valeursAuto, VARIABLES,
  type EntrepriseCourrier, type ModeleCourrierVue, type SalarieCourrier,
} from "@/lib/courriers";

type Donnees = { modeles: ModeleCourrierVue[]; salaries: (SalarieCourrier & { actif: boolean })[]; entreprise: EntrepriseCourrier | null; admin: boolean };
type Brouillon = { id?: string; nom: string; categorie: string; format: "COURRIER" | "MAIL"; objet: string; contenu: string };

const ORIGINES = { DEFAUT: "Modèle FRANEO RH", FRANEO: "Modèle FRANEO RH", ENTREPRISE: "Mon modèle" } as const;
const echapper = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export default function Courriers() {
  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [choisi, setChoisi] = useState<string | null>(null);
  const [salarieId, setSalarieId] = useState("");
  const [saisies, setSaisies] = useState<Record<string, string>>({});
  const [texteRetouche, setTexteRetouche] = useState<string | null>(null);
  const [mentionAR, setMentionAR] = useState(true);
  const [destinataire, setDestinataire] = useState(true);
  const [edition, setEdition] = useState<Brouillon | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const zoneTexte = useRef<HTMLTextAreaElement>(null);

  const charger = useCallback(async () => {
    const r = await fetch("/api/courriers");
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErreur(j.erreur || "Chargement impossible"); return; }
    setD(j);
    setChoisi((c) => c ?? j.modeles?.[0]?.id ?? null);
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const modele = d?.modeles.find((m) => m.id === choisi) ?? null;
  const salarie = d?.salaries.find((s) => s.id === salarieId) ?? null;
  const admin = !!d?.admin;
  const modifiable = (m: ModeleCourrierVue) => (admin ? m.origine === "FRANEO" : m.origine === "ENTREPRISE");

  // Nouveau modèle ou nouveau salarié : on repart des valeurs automatiques
  useEffect(() => {
    setTexteRetouche(null);
    if (modele) { setMentionAR(modele.format === "COURRIER" && modele.categorie !== "Attestations"); setDestinataire(modele.categorie !== "Attestations"); }
  }, [choisi, salarieId]); // eslint-disable-line react-hooks/exhaustive-deps

  const auto = useMemo(() => valeursAuto(salarie, d?.entreprise ?? null), [salarie, d]);
  const libres = modele ? champsLibres(modele.objet, modele.contenu) : [];
  const valeurs = { ...auto, ...Object.fromEntries(Object.entries(saisies).filter(([, v]) => v.trim())) };
  const objet = modele ? remplir(modele.objet ?? modele.nom, valeurs) : "";
  const texte = texteRetouche ?? (modele ? remplir(modele.contenu, valeurs) : "");
  const manquants = (objet + texte).match(/\[[^\]]{2,}\]/g)?.length ?? 0;

  const groupes = useMemo(() => {
    const m = new Map<string, ModeleCourrierVue[]>();
    for (const x of d?.modeles ?? []) m.set(x.categorie, [...(m.get(x.categorie) ?? []), x]);
    return [...m.entries()].sort((a, b) => (CATEGORIES.indexOf(a[0]) + 99) % 99 - (CATEGORIES.indexOf(b[0]) + 99) % 99);
  }, [d]);

  /* ───── Actions sur le courrier rédigé ───── */
  function imprimer() {
    if (!modele) return;
    const e = d?.entreprise;
    const w = window.open("", "_blank");
    if (!w) { setMsg({ ok: false, t: "Autorisez les fenêtres pop-up pour imprimer." }); return; }
    const adresseEnt = e ? [e.rue, [e.codePostal, e.ville].filter(Boolean).join(" ")].filter(Boolean).map((x) => echapper(String(x))).join("<br>") : "";
    const adresseSal = salarie ? [`${salarie.prenom} ${salarie.nom}`, salarie.rue, [salarie.codePostal, salarie.ville].filter(Boolean).join(" ")].filter(Boolean).map((x) => echapper(String(x))).join("<br>") : "";
    const estMail = modele.format === "MAIL";
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${echapper(objet)}</title>
<style>
  @page { size: A4; margin: 22mm 20mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 11.5pt; line-height: 1.5; margin: 0; }
  .entete { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
  .exp strong { font-size: 13pt; }
  .logo { max-height: 70px; max-width: 200px; object-fit: contain; }
  .dest { margin: 28px 0 0 auto; width: 46%; }
  .lieu { margin: 26px 0 0 auto; width: 46%; }
  .mention { margin-top: 22px; font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: .03em; }
  .objet { margin: 22px 0 18px; font-weight: bold; }
  .corps { white-space: pre-line; text-align: justify; }
  .pied { margin-top: 40px; font-size: 8.5pt; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 6px; }
</style></head><body>
${estMail ? "" : `<div class="entete"><div class="exp"><strong>${echapper(e?.nom ?? "")}</strong><br>${adresseEnt}${e?.siret ? `<br>SIRET ${echapper(e.siret)}` : ""}</div>${e?.logo ? `<img class="logo" src="${location.origin}/api/entreprises/logo" alt="">` : ""}</div>
${destinataire && adresseSal ? `<div class="dest">${adresseSal}</div>` : ""}
<div class="lieu">${echapper(e?.ville ? `${e.ville}, le ${valeurs.date}` : `Le ${valeurs.date}`)}</div>
${mentionAR ? `<div class="mention">Lettre recommandée avec accusé de réception<br>ou remise en main propre contre décharge</div>` : ""}`}
<div class="objet">${estMail ? "" : "Objet : "}${echapper(objet)}</div>
<div class="corps">${echapper(texte)}</div>
</body></html>`);
    w.document.close();
    // Laisse le temps au logo de se charger avant d'ouvrir la fenêtre d'impression
    setTimeout(() => { w.focus(); w.print(); }, 400);
  }

  async function copier() {
    try { await navigator.clipboard.writeText(`${objet}\n\n${texte}`); setMsg({ ok: true, t: "📋 Texte copié" }); }
    catch { setMsg({ ok: false, t: "Copie impossible : sélectionnez le texte à la main." }); }
  }

  async function envoyer() {
    if (!salarie) return;
    if (!confirm(`Envoyer ce ${modele?.format === "MAIL" ? "message" : "courrier"} par e-mail à ${salarie.prenom} ${salarie.nom} (${salarie.email}) ?`)) return;
    setOccupe(true); setMsg(null);
    const r = await fetch("/api/courriers/envoyer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ salarieId: salarie.id, objet, texte }) });
    const j = await r.json().catch(() => ({}));
    setOccupe(false);
    setMsg(r.ok ? { ok: true, t: `✉️ Envoyé à ${j.email}` } : { ok: false, t: j.erreur || "Erreur" });
  }

  /* ───── Gestion des modèles ───── */
  function nouveau(depuis?: ModeleCourrierVue) {
    setEdition(depuis
      ? { nom: modifiable(depuis) ? depuis.nom : `${depuis.nom} (personnalisé)`, categorie: depuis.categorie, format: depuis.format, objet: depuis.objet ?? "", contenu: depuis.contenu, ...(modifiable(depuis) ? { id: depuis.id } : {}) }
      : { nom: "", categorie: admin ? "Relances" : "Mes modèles", format: "COURRIER", objet: "", contenu: "Madame, Monsieur,\n\n\n\nNous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.\n\n{{Nom et fonction du signataire}}" });
    setMsg(null);
  }

  function inserer(champ: string) {
    if (!edition) return;
    const t = zoneTexte.current;
    const ajout = `{{${champ}}}`;
    if (!t) { setEdition({ ...edition, contenu: edition.contenu + ajout }); return; }
    const debut = t.selectionStart ?? edition.contenu.length, fin = t.selectionEnd ?? debut;
    const contenu = edition.contenu.slice(0, debut) + ajout + edition.contenu.slice(fin);
    setEdition({ ...edition, contenu });
    requestAnimationFrame(() => { t.focus(); t.setSelectionRange(debut + ajout.length, debut + ajout.length); });
  }

  async function enregistrer() {
    if (!edition) return;
    setOccupe(true); setMsg(null);
    const r = await fetch(edition.id ? `/api/courriers/${edition.id}` : "/api/courriers", { method: edition.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(edition) });
    const j = await r.json().catch(() => ({}));
    setOccupe(false);
    if (!r.ok) { setMsg({ ok: false, t: j.erreur || "Erreur" }); return; }
    setMsg({ ok: true, t: "✅ Modèle enregistré" });
    if (j.id) setChoisi(j.id); else if (edition.id) setChoisi(edition.id);
    setEdition(null);
    await charger();
  }

  async function supprimer(m: ModeleCourrierVue) {
    if (!confirm(`Supprimer le modèle « ${m.nom} » ?`)) return;
    const r = await fetch(`/api/courriers/${m.id}`, { method: "DELETE" });
    if (r.ok) { setChoisi(null); await charger(); } else setMsg({ ok: false, t: (await r.json().catch(() => ({}))).erreur || "Erreur" });
  }

  if (erreur) return <div className="bg-white rounded-xl shadow p-6 text-red-700">{erreur}</div>;
  if (!d) return <div className="bg-white rounded-xl shadow p-6 text-gray-500">Chargement…</div>;

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Liste des modèles */}
        <aside className="bg-white rounded-xl shadow p-4 flex flex-col gap-4 self-start">
          <button type="button" onClick={() => nouveau()} className="bg-orange-500 text-white rounded-lg px-4 py-2 font-semibold hover:bg-orange-600">➕ Nouveau modèle</button>
          {groupes.map(([cat, liste]) => (
            <div key={cat}>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">{cat}</p>
              <div className="flex flex-col gap-1">
                {liste.map((m) => (
                  <button key={m.id} type="button" onClick={() => { setChoisi(m.id); setEdition(null); setSaisies({}); setMsg(null); }}
                    className={`text-left rounded-lg px-3 py-2 text-sm transition ${choisi === m.id && !edition ? "bg-orange-50 text-orange-800 font-semibold" : "hover:bg-gray-50"}`}
                    style={choisi === m.id && !edition ? { boxShadow: "inset 3px 0 0 #f97316" } : undefined}>
                    <span className="mr-1">{m.format === "MAIL" ? "📧" : "📄"}</span>{m.nom}
                    {m.origine === "ENTREPRISE" && <span className="block text-xs text-gray-400">Mon modèle</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Éditeur de modèle */}
        {edition ? (
          <section className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold">{edition.id ? "✏️ Modifier le modèle" : "➕ Nouveau modèle"}</h2>
              <button type="button" onClick={() => setEdition(null)} className="text-sm text-gray-500 underline">Annuler</button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm font-semibold md:col-span-2">Nom du modèle
                <input value={edition.nom} onChange={(e) => setEdition({ ...edition, nom: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 font-normal" placeholder="Ex. : Convocation à un entretien" />
              </label>
              <label className="text-sm font-semibold">Type
                <select value={edition.format} onChange={(e) => setEdition({ ...edition, format: e.target.value as "COURRIER" | "MAIL" })} className="mt-1 w-full border rounded-lg px-3 py-2 font-normal">
                  <option value="COURRIER">📄 Courrier (à imprimer)</option>
                  <option value="MAIL">📧 E-mail</option>
                </select>
              </label>
              <label className="text-sm font-semibold">Catégorie
                <input list="categories-courriers" value={edition.categorie} onChange={(e) => setEdition({ ...edition, categorie: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 font-normal" />
                <datalist id="categories-courriers">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
              </label>
              <label className="text-sm font-semibold md:col-span-2">Objet
                <input value={edition.objet} onChange={(e) => setEdition({ ...edition, objet: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 font-normal" placeholder="Ex. : Convocation à un entretien préalable" />
              </label>
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">Champs remplis automatiquement <span className="font-normal text-gray-500">(cliquez pour insérer à l&apos;endroit du curseur)</span></p>
              <div className="flex flex-wrap gap-1">
                {VARIABLES.map((v) => <button key={v.cle} type="button" onClick={() => inserer(v.cle)} className="text-xs border rounded-full px-2 py-1 bg-gray-50 hover:bg-orange-50">{v.label}</button>)}
                <button type="button" onClick={() => { const n = prompt("Nom de la case à compléter (ex. : Date de l'entretien)"); if (n?.trim()) inserer(n.trim()); }} className="text-xs border border-orange-300 text-orange-700 rounded-full px-2 py-1 bg-orange-50">➕ Case à compléter…</button>
              </div>
            </div>
            <textarea ref={zoneTexte} value={edition.contenu} onChange={(e) => setEdition({ ...edition, contenu: e.target.value })} rows={18} className="border rounded-lg px-3 py-2 font-mono text-sm" aria-label="Texte du modèle" />
            <p className="text-xs text-gray-500">Astuce : écrivez <code>{"{{Date de l'entretien}}"}</code> pour créer une case à compléter au moment de rédiger. Ajoutez « facultatif » dans son nom si elle peut rester vide.</p>
            {msg && <p className="text-sm font-semibold" style={{ color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.t}</p>}
            <button type="button" disabled={occupe} onClick={enregistrer} className="self-start bg-black text-white rounded-lg px-5 py-2 font-semibold">{occupe ? "…" : "💾 Enregistrer le modèle"}</button>
          </section>
        ) : modele ? (
          /* Rédaction d'un courrier */
          <section className="flex flex-col gap-4 min-w-0">
            <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
              <div className="flex justify-between gap-3 flex-wrap items-start">
                <div>
                  <p className="text-xs text-gray-400">{ORIGINES[modele.origine]} · {modele.format === "MAIL" ? "E-mail" : "Courrier"}</p>
                  <h2 className="text-xl font-bold">{modele.nom}</h2>
                </div>
                <div className="flex gap-3 text-sm">
                  <button type="button" onClick={() => nouveau(modele)} className="font-semibold text-orange-700">{modifiable(modele) ? "✏️ Modifier" : "📑 Dupliquer pour personnaliser"}</button>
                  {modifiable(modele) && <button type="button" onClick={() => supprimer(modele)} className="text-red-600">🗑️ Supprimer</button>}
                </div>
              </div>
              {modele.conseil && <p className="text-sm rounded-lg p-3" style={{ background: "#eff6ff", color: "#1e3a8a" }}>💡 {modele.conseil}</p>}

              {!admin && (
                <label className="text-sm font-semibold">Salarié
                  <select value={salarieId} onChange={(e) => setSalarieId(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 font-normal">
                    <option value="">— Choisir un salarié —</option>
                    {d.salaries.map((s) => <option key={s.id} value={s.id}>{s.nom} {s.prenom} · {s.poste}{s.actif ? "" : " (sorti)"}</option>)}
                  </select>
                </label>
              )}
              {libres.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                  {libres.map((c) => (
                    <label key={c} className="text-sm font-semibold">{c.replace(/\s*\(facultatif\)/i, "")}{estFacultatif(c) ? <span className="font-normal text-gray-400"> (facultatif)</span> : ""}
                      <input value={saisies[c] ?? ""} onChange={(e) => { setSaisies({ ...saisies, [c]: e.target.value }); setTexteRetouche(null); }} className="mt-1 w-full border rounded-lg px-3 py-2 font-normal" />
                    </label>
                  ))}
                </div>
              )}
              {modele.format === "COURRIER" && (
                <div className="flex gap-4 flex-wrap text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={mentionAR} onChange={(e) => setMentionAR(e.target.checked)} /> Mention « recommandé avec AR / remise en main propre »</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={destinataire} onChange={(e) => setDestinataire(e.target.checked)} /> Adresse du salarié en destinataire</label>
                </div>
              )}
            </div>

            {/* Aperçu : la feuille */}
            <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-3">
              <div className="flex justify-between items-center gap-3 flex-wrap">
                <h3 className="font-bold">👀 Aperçu</h3>
                {manquants > 0 ? <span className="text-xs font-semibold rounded-full px-3 py-1" style={{ background: "#fef3c7", color: "#92400e" }}>{manquants} information(s) à compléter</span>
                  : <span className="text-xs font-semibold rounded-full px-3 py-1" style={{ background: "#dcfce7", color: "#166534" }}>✅ Prêt</span>}
              </div>
              <div className="mx-auto w-full rounded-lg border p-6 md:p-10" style={{ maxWidth: 720, background: "#ffffff", boxShadow: "0 8px 24px rgba(17,24,39,0.08)" }}>
                <p className="font-bold mb-4">Objet : {objet}</p>
                {texteRetouche === null ? (
                  <div className="text-sm leading-relaxed" style={{ whiteSpace: "pre-line" }}>
                    {texte.split(/(\[[^\]]{2,}\])/g).map((part, i) => /^\[[^\]]{2,}\]$/.test(part)
                      ? <mark key={i} style={{ background: "#fef3c7", color: "#92400e", borderRadius: 4, padding: "0 3px" }}>{part}</mark>
                      : <span key={i}>{part}</span>)}
                  </div>
                ) : (
                  <textarea value={texteRetouche} onChange={(e) => setTexteRetouche(e.target.value)} rows={20} className="w-full border rounded-lg p-3 text-sm leading-relaxed" aria-label="Texte du courrier" />
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {texteRetouche === null
                  ? <button type="button" onClick={() => setTexteRetouche(texte)} className="border rounded-lg px-4 py-2 text-sm font-semibold">✏️ Retoucher le texte</button>
                  : <button type="button" onClick={() => setTexteRetouche(null)} className="border rounded-lg px-4 py-2 text-sm font-semibold">↩️ Revenir au modèle</button>}
                <button type="button" onClick={imprimer} className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-semibold">🖨️ Imprimer / PDF</button>
                <button type="button" onClick={copier} className="border rounded-lg px-4 py-2 text-sm font-semibold">📋 Copier</button>
                {!admin && (
                  <button type="button" disabled={!salarie?.email || occupe || manquants > 0} onClick={envoyer}
                    title={!salarie ? "Choisissez un salarié" : !salarie.email ? "Pas d'e-mail sur sa fiche" : manquants > 0 ? "Complétez les informations manquantes" : undefined}
                    className="bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40">✉️ Envoyer par e-mail{salarie?.email ? ` à ${salarie.prenom}` : ""}</button>
                )}
              </div>
              {msg && <p className="text-sm font-semibold" style={{ color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.t}</p>}
            </div>
          </section>
        ) : (
          <div className="bg-white rounded-xl shadow p-8 text-gray-500">Choisissez un modèle.</div>
        )}
      </div>
    </div>
  );
}
