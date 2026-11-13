"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MENTION_FRANCHISE_TVA, MODELES_METIER, STATUTS_DEVIS, TYPES_LIGNE, type LigneDevis } from "@/lib/projets-constantes";
import { couleurMarge, eur, h, iso, pct } from "./outils";

type Devis = {
  id: string; numero: string; objet: string; client: string | null; clientAdresse: string | null; clientEmail: string | null; statut: string; supplementaire: boolean; modele: string | null;
  lignes: LigneDevis[]; margeVisee: number; tauxTva: number; acomptePct: number | null; validiteJours: number; conditions: string | null; dateDebut: string | null; dateFin: string | null;
  projetId: string | null; projet: { id: string; nom: string } | null;
};
type Sal = { id: string; nom: string; poste: string; coutHoraire: number | null };

const r2 = (n: number) => Math.round(n * 100) / 100;

export default function EditeurDevis({ id }: { id: string }) {
  const router = useRouter();
  const [d, setD] = useState<Devis | null>(null);
  const [salaries, setSalaries] = useState<Sal[]>([]);
  const [coutMoyen, setCoutMoyen] = useState<number | null>(null);
  const [peutGerer, setPeutGerer] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [modifie, setModifie] = useState(false);

  const charger = useCallback(async () => {
    const r = await fetch(`/api/projets/devis/${id}`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg({ ok: false, t: j.erreur || "Devis introuvable" }); return; }
    setD({ ...j.devis, lignes: j.devis.lignes }); setSalaries(j.salaries); setCoutMoyen(j.coutMoyen); setPeutGerer(j.peutGerer); setModifie(false);
  }, [id]);
  useEffect(() => { charger(); }, [charger]);

  const t = useMemo(() => {
    const l = d?.lignes ?? [];
    const ht = r2(l.reduce((s, x) => s + x.quantite * x.prixUnitaire, 0)), cout = r2(l.reduce((s, x) => s + x.quantite * x.coutUnitaire, 0));
    const heures = r2(l.filter((x) => x.type === "MO").reduce((s, x) => s + (/^j/.test(x.unite) ? x.quantite * 7 : x.quantite), 0));
    const tva = r2((ht * (d?.tauxTva ?? 20)) / 100);
    return { ht, cout, marge: r2(ht - cout), taux: ht > 0 ? r2(((ht - cout) / ht) * 100) : null, heures, tva, ttc: r2(ht + tva) };
  }, [d]);

  if (!d) return <div className="bg-white rounded-xl shadow p-6 text-gray-500">{msg?.t ?? "Chargement…"}</div>;
  const modifiable = peutGerer && (d.statut === "BROUILLON" || d.statut === "ENVOYE");
  const maj = (x: Partial<Devis>) => { setD({ ...d, ...x }); setModifie(true); setMsg(null); };
  const majLigne = (i: number, x: Partial<LigneDevis>) => maj({ lignes: d.lignes.map((l, k) => (k === i ? { ...l, ...x } : l)) });
  const prixCible = (cout: number) => (cout > 0 ? r2(cout / (1 - d.margeVisee / 100)) : 0);
  const coutSal = (sid: string | null | undefined) => (sid ? salaries.find((s) => s.id === sid)?.coutHoraire ?? null : coutMoyen);

  async function enregistrer() {
    const r = await fetch(`/api/projets/devis/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...d, dateDebut: iso(d!.dateDebut), dateFin: iso(d!.dateFin) }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { setModifie(false); setMsg({ ok: true, t: "✅ Devis enregistré" }); return true; }
    setMsg({ ok: false, t: j.erreur || "Enregistrement impossible" }); return false;
  }
  async function action(a: string, question?: string) {
    if (question && !confirm(question)) return;
    if (modifie && modifiable && !(await enregistrer())) return;
    const r = await fetch(`/api/projets/devis/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: a }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg({ ok: false, t: j.erreur || "Action impossible" }); return; }
    if (a === "accepter" && j.projetId) { router.push(`/client/projets/${j.projetId}`); return; }
    if (a === "dupliquer" && j.id) { router.push(`/client/projets/devis/${j.id}`); return; }
    charger();
  }

  const s = STATUTS_DEVIS[d.statut as keyof typeof STATUTS_DEVIS];
  const input = "border rounded-lg px-2 py-1 w-full";
  return (
    <>
      <div className="bg-white rounded-xl shadow p-6">
        <Link href="/client/projets/devis" className="text-sm text-gray-500 underline">← Tous les devis</Link>
        <div className="flex flex-wrap justify-between gap-3 mt-2">
          <div>
            <h1 className="text-3xl font-bold">🧾 Devis {d.numero}</h1>
            <p className="text-gray-500 mt-1">
              <span className="text-xs font-semibold px-2 py-1 rounded-full mr-2" style={{ background: `${s?.couleur}1a`, color: s?.couleur }}>{s?.label}</span>
              {d.supplementaire && d.projet ? <>Travaux supplémentaires sur <Link href={`/client/projets/${d.projet.id}`} className="underline">{d.projet.nom}</Link></> : d.projet ? <>Projet créé : <Link href={`/client/projets/${d.projet.id}`} className="underline">{d.projet.nom}</Link></> : d.modele ? `${MODELES_METIER[d.modele]?.icone} ${MODELES_METIER[d.modele]?.label}` : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-start">
            {modifiable && <button type="button" onClick={enregistrer} disabled={!modifie} className="bg-black text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-40">💾 Enregistrer</button>}
            <a href={`/client/projets/devis/${id}/imprimer`} target="_blank" rel="noreferrer" className="border px-4 py-2 rounded-lg font-semibold">🖨️ PDF / imprimer</a>
            {peutGerer && d.statut === "BROUILLON" && <button type="button" onClick={() => action("envoyer")} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold">📤 Marquer envoyé</button>}
            {peutGerer && (d.statut === "ENVOYE" || d.statut === "BROUILLON") && <button type="button" onClick={() => action("accepter", d.supplementaire ? "Le client a accepté ? Le montant sera ajouté au projet et une échéance à facturer sera créée." : "Le client a accepté ? Le projet sera créé avec son budget, son planning, ses frais prévus et son échéancier de facturation.")} className="bg-green-700 text-white px-4 py-2 rounded-lg font-semibold">✅ Accepté par le client</button>}
            {peutGerer && d.statut === "ENVOYE" && <button type="button" onClick={() => action("refuser", "Marquer ce devis comme refusé ?")} className="border border-red-300 text-red-700 px-4 py-2 rounded-lg font-semibold">Refusé</button>}
            {peutGerer && d.statut === "REFUSE" && <button type="button" onClick={() => action("rouvrir")} className="border px-4 py-2 rounded-lg font-semibold">Rouvrir</button>}
            {peutGerer && <button type="button" onClick={() => action("dupliquer")} className="border px-4 py-2 rounded-lg font-semibold">📄 Dupliquer</button>}
            {peutGerer && d.statut !== "ACCEPTE" && <button type="button" onClick={async () => { if (confirm("Supprimer ce devis ?")) { const r = await fetch(`/api/projets/devis/${id}`, { method: "DELETE" }); if (r.ok) router.push("/client/projets/devis"); } }} className="border border-red-300 text-red-700 px-3 py-2 rounded-lg">🗑️</button>}
          </div>
        </div>
        {msg && <p className="mt-3 text-sm font-semibold" style={{ color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.t}</p>}
      </div>

      <fieldset disabled={!modifiable} className="bg-white rounded-xl shadow p-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="text-sm font-semibold md:col-span-2">Objet<input className={input} value={d.objet} onChange={(e) => maj({ objet: e.target.value })} /></label>
        <label className="text-sm font-semibold">Client<input className={input} value={d.client ?? ""} onChange={(e) => maj({ client: e.target.value })} /></label>
        <label className="text-sm font-semibold">E-mail du client<input type="email" className={input} value={d.clientEmail ?? ""} onChange={(e) => maj({ clientEmail: e.target.value })} /></label>
        <label className="text-sm font-semibold md:col-span-2">Adresse du client<textarea rows={2} className={input} value={d.clientAdresse ?? ""} onChange={(e) => maj({ clientAdresse: e.target.value })} /></label>
        <label className="text-sm font-semibold">Début prévu<input type="date" className={input} value={iso(d.dateDebut)} onChange={(e) => maj({ dateDebut: e.target.value || null })} /></label>
        <label className="text-sm font-semibold">Fin prévue<input type="date" className={input} value={iso(d.dateFin)} onChange={(e) => maj({ dateFin: e.target.value || null })} /></label>
        <label className="text-sm font-semibold">Marge visée (%)<input type="number" min="0" max="90" className={input} value={d.margeVisee} onChange={(e) => maj({ margeVisee: Number(e.target.value) })} /></label>
        <label className="text-sm font-semibold">TVA
          <select className={input} value={d.tauxTva} onChange={(e) => maj({ tauxTva: Number(e.target.value) })}>
            <option value={20}>20 %</option><option value={10}>10 % (travaux de rénovation)</option><option value={5.5}>5,5 % (rénovation énergétique)</option><option value={0}>0 % — franchise en base</option>
          </select>
        </label>
        <label className="text-sm font-semibold">Acompte à la commande (%)<input type="number" min="0" max="100" className={input} value={d.acomptePct ?? ""} onChange={(e) => maj({ acomptePct: e.target.value === "" ? null : Number(e.target.value) })} /></label>
        <label className="text-sm font-semibold">Validité (jours)<input type="number" min="1" className={input} value={d.validiteJours} onChange={(e) => maj({ validiteJours: Number(e.target.value) })} /></label>
        <label className="text-sm font-semibold md:col-span-4">Conditions / remarques<textarea rows={2} className={input} value={d.conditions ?? ""} onChange={(e) => maj({ conditions: e.target.value })} placeholder="Délais, conditions d'intervention, ce qui n'est pas compris…" /></label>
      </fieldset>

      <div className="bg-white rounded-xl shadow p-6 overflow-x-auto">
        <div className="flex flex-wrap justify-between gap-2 mb-3">
          <h2 className="text-xl font-bold">Lignes du devis</h2>
          {modifiable && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => maj({ lignes: d.lignes.map((l) => (l.coutUnitaire > 0 ? { ...l, prixUnitaire: prixCible(l.coutUnitaire) } : l)) })} className="border rounded-lg px-3 py-1 text-sm font-semibold">🎯 Appliquer la marge visée ({d.margeVisee} %)</button>
              {Object.entries(TYPES_LIGNE).map(([k, x]) => (
                <button key={k} type="button" onClick={() => { const cout = k === "MO" ? coutMoyen ?? 0 : 0; maj({ lignes: [...d.lignes, { libelle: x.label, type: k as LigneDevis["type"], quantite: 1, unite: x.unite, coutUnitaire: cout, prixUnitaire: prixCible(cout), salarieId: null }] }); }} className="border rounded-lg px-3 py-1 text-sm">+ {x.label}</button>
              ))}
            </div>
          )}
        </div>
        <table className="w-full text-sm" style={{ minWidth: 900 }}>
          <thead className="bg-gray-50 text-left"><tr><th className="p-2">Désignation</th><th className="p-2">Qui (main-d&apos;œuvre)</th><th className="p-2 w-20">Qté</th><th className="p-2 w-20">Unité</th><th className="p-2 w-28">Coût unit.</th><th className="p-2 w-28">Prix unit. HT</th><th className="p-2 text-right">Total HT</th><th className="p-2 text-right">Marge</th><th /></tr></thead>
          <tbody>
            {d.lignes.length === 0 && <tr><td colSpan={9} className="p-4 text-center text-gray-500">Ajoutez des lignes avec les boutons ci-dessus.</td></tr>}
            {d.lignes.map((l, i) => {
              const tl = r2(l.quantite * l.prixUnitaire), ml = l.prixUnitaire > 0 ? r2(((l.prixUnitaire - l.coutUnitaire) / l.prixUnitaire) * 100) : null;
              return (
                <tr key={i} className="border-t align-top">
                  <td className="p-2"><input disabled={!modifiable} className={input} value={l.libelle} onChange={(e) => majLigne(i, { libelle: e.target.value })} /><span className="text-xs text-gray-500">{TYPES_LIGNE[l.type]?.label}</span></td>
                  <td className="p-2">{l.type === "MO" ? (
                    <select disabled={!modifiable} className={input} value={l.salarieId ?? ""} onChange={(e) => { const c = coutSal(e.target.value || null) ?? 0; majLigne(i, { salarieId: e.target.value || null, coutUnitaire: /^j/.test(l.unite) ? r2(c * 7) : c }); }}>
                      <option value="">Profil moyen{coutMoyen ? ` (${coutMoyen} €/h)` : ""}</option>
                      {salaries.map((s) => <option key={s.id} value={s.id}>{s.nom}{s.coutHoraire ? ` (${s.coutHoraire} €/h)` : " (coût inconnu)"}</option>)}
                    </select>
                  ) : <span className="text-xs text-gray-400">—</span>}</td>
                  <td className="p-2"><input disabled={!modifiable} type="number" step="0.25" className={input} value={l.quantite} onChange={(e) => majLigne(i, { quantite: Number(e.target.value) })} /></td>
                  <td className="p-2"><input disabled={!modifiable} className={input} value={l.unite} onChange={(e) => majLigne(i, { unite: e.target.value })} /></td>
                  <td className="p-2"><input disabled={!modifiable} type="number" step="0.01" className={input} value={l.coutUnitaire} onChange={(e) => majLigne(i, { coutUnitaire: Number(e.target.value) })} /></td>
                  <td className="p-2"><input disabled={!modifiable} type="number" step="0.01" className={input} value={l.prixUnitaire} onChange={(e) => majLigne(i, { prixUnitaire: Number(e.target.value) })} /></td>
                  <td className="p-2 text-right font-semibold whitespace-nowrap">{eur(tl)}</td>
                  <td className="p-2 text-right font-semibold" style={{ color: couleurMarge(ml) }}>{pct(ml)}</td>
                  <td className="p-2">{modifiable && <button type="button" aria-label="Supprimer la ligne" onClick={() => maj({ lignes: d.lignes.filter((_, k) => k !== i) })} className="text-red-700">✕</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="rounded-xl p-4 text-sm" style={{ background: "#f9fafb" }}>
            <p className="font-bold mb-1">🔒 Rentabilité (interne, n&apos;apparaît pas sur le devis)</p>
            <p>Coût de revient : <strong>{eur(t.cout)}</strong> · dont {h(t.heures)} de main-d&apos;œuvre</p>
            <p>Marge : <strong style={{ color: couleurMarge(t.taux) }}>{eur(t.marge)} ({pct(t.taux)})</strong> pour {d.margeVisee} % visés</p>
            {t.taux != null && t.taux < d.margeVisee && <p className="text-orange-700 mt-1">⚠️ Marge en dessous de l&apos;objectif : utilisez « Appliquer la marge visée » ou revoyez les prix.</p>}
            {d.lignes.some((l) => l.type === "MO" && !l.coutUnitaire) && <p className="text-orange-700 mt-1">⚠️ Une ligne de main-d&apos;œuvre n&apos;a pas de coût : renseignez les salaires ou les coûts standards (Rentabilité &amp; coûts).</p>}
          </div>
          <div className="text-sm">
            <div className="flex justify-between py-1"><span>Total HT</span><strong>{eur(t.ht)}</strong></div>
            <div className="flex justify-between py-1"><span>TVA {d.tauxTva} %</span><span>{d.tauxTva === 0 ? MENTION_FRANCHISE_TVA : eur(t.tva)}</span></div>
            <div className="flex justify-between py-2 border-t text-lg"><span className="font-bold">Total TTC</span><strong>{eur(t.ttc)}</strong></div>
            {d.acomptePct ? <div className="flex justify-between py-1 text-gray-600"><span>Acompte à la commande ({d.acomptePct} %)</span><span>{eur(r2((t.ttc * d.acomptePct) / 100))} TTC</span></div> : null}
          </div>
        </div>
      </div>
    </>
  );
}
