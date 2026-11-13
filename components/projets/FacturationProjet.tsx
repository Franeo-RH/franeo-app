"use client";

import Link from "next/link";
import { useState } from "react";
import { MENTION_FRANCHISE_TVA, STATUTS_DEVIS } from "@/lib/projets-constantes";
import ListeFactures from "./ListeFactures";
import { eur } from "./outils";

type Jalon = { id: string; libelle: string; montant: number | null; facturation: string };
type DevisLite = { id: string; numero: string; objet: string; statut: string; totalHT: number; supplementaire: boolean };
type Apercu = { lignes: { libelle: string; quantite: number; unite: string; prixUnitaire: number }[]; totalHT: number; totalTTC: number; tauxTva: number; avertissement: string | null; dejaFacture: number; vendu: number };

const auj = () => new Date().toISOString().slice(0, 10);
const debutMois = () => new Date().toISOString().slice(0, 8) + "01";

/** Fiche projet › Facturation : créer une facture (acompte, situation, régie, échéance, mensuelle, solde, avoir), devis et travaux supplémentaires */
export default function FacturationProjet({ projet, peutGerer, onChange }: {
  projet: { id: string; nom: string; modeVente: string; tauxJournalier: number | null; montantMensuel: number | null; jalons: Jalon[]; devis: DevisLite[]; synthese: { vendu: number; venduContrat: number; facture: number; paye: number; resteAFacturer: number } };
  peutGerer: boolean; onChange: () => void;
}) {
  const [type, setType] = useState("");
  const [p, setP] = useState({ jalonId: "", pct: "30", avancement: "", du: debutMois(), au: auj(), mois: new Date().toISOString().slice(0, 7), montant: "", motif: "", tauxTva: "20", note: "" });
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [tick, setTick] = useState(0);
  const s = projet.synthese;
  const jalonsAFacturer = projet.jalons.filter((j) => j.facturation === "A_FACTURER" && j.montant);

  const corps = (apercuSeul: boolean) => ({ projetId: projet.id, type, ...p, apercu: apercuSeul });
  async function calculer() {
    setMsg(null); setApercu(null);
    const r = await fetch("/api/projets/factures", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps(true)) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setApercu(j); else setMsg({ ok: false, t: j.erreur || "Calcul impossible" });
  }
  async function emettre() {
    const r = await fetch("/api/projets/factures", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps(false)) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg({ ok: false, t: j.erreur || "Facture impossible" }); return; }
    setMsg({ ok: true, t: `✅ Facture ${j.numero} créée.${j.avertissement ? ` ${j.avertissement}` : ""}` });
    setApercu(null); setType(""); setTick((x) => x + 1); onChange();
    window.open(`/client/projets/factures/${j.id}/imprimer`, "_blank");
  }
  async function nouveauDevisSupp() {
    const objet = prompt("Objet des travaux supplémentaires :", "Travaux supplémentaires");
    if (!objet) return;
    const r = await fetch("/api/projets/devis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ objet, projetId: projet.id }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) window.location.href = `/client/projets/devis/${j.id}`; else setMsg({ ok: false, t: j.erreur || "Création impossible" });
  }

  const TYPES: { id: string; label: string; visible: boolean }[] = [
    { id: "JALON", label: "🏁 Une échéance prévue", visible: jalonsAFacturer.length > 0 },
    { id: "ACOMPTE", label: "💰 Acompte", visible: projet.modeVente !== "INTERNE" },
    { id: "SITUATION", label: "🏗️ Situation de travaux (% d'avancement)", visible: projet.modeVente === "FORFAIT" },
    { id: "REGIE", label: "⏱️ Régie (temps passé)", visible: projet.modeVente === "REGIE" || !!projet.tauxJournalier },
    { id: "MENSUELLE", label: "🔁 Facture du mois", visible: projet.modeVente === "RECURRENT" },
    { id: "SOLDE", label: "✅ Solde", visible: projet.modeVente === "FORFAIT" || projet.modeVente === "REGIE" },
    { id: "AVOIR", label: "↩️ Avoir", visible: true },
  ];
  const input = "border rounded-lg px-3 py-2";

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex flex-wrap justify-between items-baseline gap-2 mb-3">
        <h2 className="text-xl font-bold">💶 Facturation</h2>
        <span className="text-sm text-gray-600">Vendu {eur(projet.modeVente === "RECURRENT" ? s.vendu : s.venduContrat)} · facturé {eur(s.facture)} · encaissé {eur(s.paye)} · <strong>reste à facturer {eur(s.resteAFacturer)}</strong></span>
      </div>

      {peutGerer && projet.modeVente !== "INTERNE" && (
        <div className="rounded-xl border p-4 mb-4">
          <p className="font-semibold mb-2">Nouvelle facture</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {TYPES.filter((x) => x.visible).map((x) => (
              <button key={x.id} type="button" onClick={() => { setType(x.id); setApercu(null); setMsg(null); }} className="rounded-lg px-3 py-2 text-sm font-semibold border" style={{ background: type === x.id ? "#111827" : "#fff", color: type === x.id ? "#fff" : "#111827" }}>{x.label}</button>
            ))}
          </div>
          {type && (
            <div className="flex flex-wrap gap-3 items-end text-sm">
              {type === "JALON" && <label>Échéance<select className={`${input} block`} value={p.jalonId} onChange={(e) => setP({ ...p, jalonId: e.target.value })}><option value="">Choisir…</option>{jalonsAFacturer.map((j) => <option key={j.id} value={j.id}>{j.libelle} — {eur(j.montant)}</option>)}</select></label>}
              {type === "ACOMPTE" && <><label>% du prix<input type="number" min="1" max="100" className={`${input} block w-24`} value={p.pct} onChange={(e) => setP({ ...p, pct: e.target.value, montant: "" })} /></label><label>ou montant HT<input type="number" min="0" step="0.01" className={`${input} block w-32`} value={p.montant} onChange={(e) => setP({ ...p, montant: e.target.value })} /></label></>}
              {type === "SITUATION" && <label>Avancement cumulé (%)<input type="number" min="1" max="100" className={`${input} block w-28`} value={p.avancement} onChange={(e) => setP({ ...p, avancement: e.target.value })} /></label>}
              {type === "REGIE" && <><label>Du<input type="date" className={`${input} block`} value={p.du} onChange={(e) => setP({ ...p, du: e.target.value })} /></label><label>Au<input type="date" className={`${input} block`} value={p.au} onChange={(e) => setP({ ...p, au: e.target.value })} /></label></>}
              {type === "MENSUELLE" && <label>Mois<input type="month" className={`${input} block`} value={p.mois} onChange={(e) => setP({ ...p, mois: e.target.value })} /></label>}
              {type === "AVOIR" && <><label>Montant HT<input type="number" min="0" step="0.01" className={`${input} block w-32`} value={p.montant} onChange={(e) => setP({ ...p, montant: e.target.value })} /></label><label>Motif<input className={`${input} block`} value={p.motif} onChange={(e) => setP({ ...p, motif: e.target.value })} /></label></>}
              <label>TVA<select className={`${input} block`} value={p.tauxTva} onChange={(e) => setP({ ...p, tauxTva: e.target.value })}><option value="20">20 %</option><option value="10">10 %</option><option value="5.5">5,5 %</option><option value="0">0 % (franchise)</option></select></label>
              <label className="flex-1 min-w-[180px]">Note sur la facture<input className={`${input} block w-full`} value={p.note} onChange={(e) => setP({ ...p, note: e.target.value })} placeholder="facultatif" /></label>
              <button type="button" onClick={calculer} className="bg-black text-white px-4 py-2 rounded-lg font-semibold">Calculer</button>
            </div>
          )}
          {apercu && (
            <div className="mt-4 rounded-lg p-4 text-sm" style={{ background: "#f9fafb" }}>
              {apercu.lignes.map((l, i) => <p key={i} className="flex justify-between gap-3"><span>{l.libelle} — {l.quantite.toLocaleString("fr-FR")} {l.unite} × {eur(l.prixUnitaire)}</span><strong>{eur(l.quantite * l.prixUnitaire)}</strong></p>)}
              <p className="mt-2 flex justify-between border-t pt-2"><span>Total HT</span><strong>{eur(apercu.totalHT)}</strong></p>
              <p className="flex justify-between"><span>Total TTC ({apercu.tauxTva} %)</span><strong>{eur(apercu.totalTTC)}</strong></p>
              {apercu.tauxTva === 0 && <p className="text-xs text-gray-500">{MENTION_FRANCHISE_TVA}</p>}
              {apercu.avertissement && <p className="text-orange-700 font-semibold mt-1">{apercu.avertissement}</p>}
              <button type="button" onClick={emettre} className="mt-3 bg-green-700 text-white px-4 py-2 rounded-lg font-semibold">Émettre la facture</button>
            </div>
          )}
        </div>
      )}
      {msg && <p className="text-sm font-semibold mb-3" style={{ color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.t}</p>}

      <ListeFactures projetId={projet.id} compact rafraichir={tick} onChange={onChange} />

      <div className="mt-5">
        <div className="flex flex-wrap justify-between gap-2 items-baseline">
          <h3 className="font-bold">🧾 Devis et travaux supplémentaires</h3>
          {peutGerer && <button type="button" onClick={nouveauDevisSupp} className="border rounded-lg px-3 py-1 text-sm font-semibold">➕ Devis de travaux supplémentaires</button>}
        </div>
        {projet.devis.length === 0 ? <p className="text-sm text-gray-500 mt-1">Aucun devis lié. Avant de faire un « petit plus » demandé par le client, faites-lui accepter un devis : c&apos;est la première source de marge perdue.</p> : (
          <ul className="divide-y text-sm mt-1">
            {projet.devis.map((x) => {
              const st = STATUTS_DEVIS[x.statut as keyof typeof STATUTS_DEVIS];
              return <li key={x.id} className="py-2 flex justify-between gap-2"><Link href={`/client/projets/devis/${x.id}`} className="underline">{x.numero} · {x.objet}{x.supplementaire ? " (travaux supp.)" : ""}</Link><span>{eur(x.totalHT)} · <span style={{ color: st?.couleur }} className="font-semibold">{st?.label}</span></span></li>;
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
