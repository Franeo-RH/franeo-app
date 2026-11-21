"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TRAME_ENTRETIEN, TYPES_ENTRETIEN, prochainsEntretiens, statutDate } from "@/lib/entretiens";

type E = { id: string; type: string; date: string; statut: string; responsable: string | null };
type S = { id: string; prenom: string; nom: string; poste: string; dateDebut: string | null; entretiens: E[] };

const fr = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");
const COULEUR: Record<string, string> = { retard: "#dc2626", bientot: "#ea580c", ok: "#15803d", inconnu: "#9ca3af" };

/** Gestion RH › Entretiens : obligations (professionnel tous les 2 ans, bilan à 6 ans), planification, comptes rendus */
export default function EntretiensClient({ modifiable }: { modifiable: boolean }) {
  const [liste, setListe] = useState<S[]>([]);
  const [plan, setPlan] = useState<{ salarieId: string; type: string; date: string; responsable: string } | null>(null);
  const [cr, setCr] = useState<{ e: E; s: S; valeurs: Record<string, string> } | null>(null);
  const [msg, setMsg] = useState("");
  const charger = () => fetch("/api/entretiens").then((r) => r.json()).then((d) => Array.isArray(d) && setListe(d)).catch(() => {});
  useEffect(() => { charger(); }, []);

  async function planifier(e: React.FormEvent) {
    e.preventDefault();
    if (!plan) return;
    const r = await fetch("/api/entretiens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(plan) });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? "✅ Entretien planifié." : `❌ ${d.erreur || "Erreur"}`);
    if (r.ok) { setPlan(null); charger(); }
  }
  async function ouvrirCr(e: E, s: S) {
    const d = await fetch(`/api/entretiens/${e.id}/cr`).then((r) => r.json()).catch(() => ({}));
    setCr({ e, s, valeurs: d.compteRendu ?? {} });
  }
  async function enregistrerCr(realise: boolean) {
    if (!cr) return;
    const r = await fetch(`/api/entretiens/${cr.e.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ compteRendu: cr.valeurs, ...(realise ? { statut: "REALISE" } : {}) }) });
    setMsg(r.ok ? (realise ? "✅ Entretien réalisé, compte rendu enregistré." : "💾 Compte rendu enregistré.") : "❌ Erreur");
    if (r.ok) { if (realise) setCr(null); charger(); }
  }

  const lignes = liste.map((s) => ({ s, p: prochainsEntretiens(s.dateDebut, s.entretiens) }));
  const enRetard = lignes.filter((l) => statutDate(l.p.pro) === "retard" || statutDate(l.p.bilan) === "retard").length;
  const aVenir = liste.flatMap((s) => s.entretiens.filter((e) => e.statut === "PLANIFIE").map((e) => ({ e, s }))).sort((a, b) => a.e.date.localeCompare(b.e.date));
  const realises = liste.flatMap((s) => s.entretiens.filter((e) => e.statut === "REALISE").map((e) => ({ e, s }))).sort((a, b) => b.e.date.localeCompare(a.e.date)).slice(0, 30);

  return (
    <div className="flex flex-col gap-6">
      {msg && <p className="text-sm font-semibold">{msg}</p>}
      {enRetard > 0 && <div className="rounded-xl p-4 font-semibold" style={{ background: "#fee2e2", color: "#b91c1c" }}>⚠️ {enRetard} salarié(s) en retard d&apos;entretien professionnel ou de bilan à 6 ans. Sans entretien ni formation sur 6 ans, l&apos;entreprise (dès 50 salariés) doit abonder le CPF de 3 000 €.</div>}

      {cr && (
        <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-3" style={{ border: "2px solid #fdba74" }}>
          <div className="flex justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-bold">📝 {TYPES_ENTRETIEN[cr.e.type]?.label} — {cr.s.prenom} {cr.s.nom} · {fr(cr.e.date)}</h2>
            <button type="button" onClick={() => setCr(null)} className="text-gray-500">Fermer ✕</button>
          </div>
          {TRAME_ENTRETIEN.filter((t) => !t.types || t.types.includes(cr.e.type)).map((t) => (
            <label key={t.cle} className="text-sm font-semibold">{t.label}
              <textarea rows={2} disabled={!modifiable} className="w-full border rounded-lg px-3 py-2 mt-1 font-normal" value={cr.valeurs[t.cle] ?? ""} onChange={(e) => setCr({ ...cr, valeurs: { ...cr.valeurs, [t.cle]: e.target.value } })} />
            </label>
          ))}
          {modifiable && (
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={() => enregistrerCr(false)} className="border rounded-lg px-4 py-2 font-semibold">💾 Enregistrer</button>
              {cr.e.statut !== "REALISE" && <button type="button" onClick={() => enregistrerCr(true)} className="bg-green-600 text-white rounded-lg px-4 py-2 font-semibold">✅ Enregistrer et marquer réalisé</button>}
              <Link href={`/client/salaries/entretiens/${cr.e.id}`} target="_blank" className="border rounded-lg px-4 py-2 font-semibold">🖨️ Imprimer / PDF</Link>
            </div>
          )}
        </div>
      )}

      {plan && (
        <form onSubmit={planifier} className="bg-white rounded-xl shadow p-6 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", border: "2px solid #fdba74" }}>
          <p className="font-bold" style={{ gridColumn: "1 / -1" }}>🗓️ Planifier un entretien — {liste.find((s) => s.id === plan.salarieId)?.prenom} {liste.find((s) => s.id === plan.salarieId)?.nom}</p>
          <select className="border rounded-lg px-3 py-2" value={plan.type} onChange={(e) => setPlan({ ...plan, type: e.target.value })}>
            {Object.entries(TYPES_ENTRETIEN).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <input type="date" required className="border rounded-lg px-3 py-2" value={plan.date} onChange={(e) => setPlan({ ...plan, date: e.target.value })} />
          <input className="border rounded-lg px-3 py-2" placeholder="Responsable de l'entretien" value={plan.responsable} onChange={(e) => setPlan({ ...plan, responsable: e.target.value })} />
          <div className="flex gap-2"><button type="submit" className="bg-orange-500 text-white rounded-lg px-4 py-2 font-semibold">Planifier</button><button type="button" onClick={() => setPlan(null)} className="border rounded-lg px-4 py-2">Annuler</button></div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold mb-3">📅 Obligations par salarié</h2>
        <table className="w-full text-sm text-left">
          <thead><tr className="text-gray-500 border-b"><th className="pb-2">Salarié</th><th className="pb-2">Entrée</th><th className="pb-2">Dernier entretien pro</th><th className="pb-2">Prochain entretien pro</th><th className="pb-2">Bilan 6 ans</th><th /></tr></thead>
          <tbody>
            {lignes.map(({ s, p }) => (
              <tr key={s.id} className="border-b last:border-0">
                <td data-label="Salarié" className="py-2 font-semibold">{s.prenom} {s.nom}<span className="block text-xs text-gray-500 font-normal">{s.poste}</span></td>
                <td data-label="Entrée" className="py-2">{fr(s.dateDebut)}</td>
                <td data-label="Dernier pro" className="py-2">{fr(p.dernierPro)}</td>
                <td data-label="Prochain pro" className="py-2 font-semibold" style={{ color: COULEUR[statutDate(p.pro)] }}>{fr(p.pro)}{statutDate(p.pro) === "retard" ? " ⚠️" : ""}</td>
                <td data-label="Bilan 6 ans" className="py-2" style={{ color: COULEUR[statutDate(p.bilan)] }}>{fr(p.bilan)}</td>
                <td data-label="" className="py-2 text-right">{modifiable && <button type="button" onClick={() => setPlan({ salarieId: s.id, type: statutDate(p.bilan) === "retard" ? "ETAT_DES_LIEUX" : "PROFESSIONNEL", date: "", responsable: "" })} className="text-orange-600 font-semibold hover:underline">🗓️ Planifier</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}>
        {[{ t: `🗓️ À venir (${aVenir.length})`, l: aVenir }, { t: "✅ Réalisés récemment", l: realises }].map((b) => (
          <div key={b.t} className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-bold mb-3">{b.t}</h2>
            {b.l.length === 0 ? <p className="text-sm text-gray-500">Aucun.</p> : (
              <ul className="flex flex-col text-sm">
                {b.l.map(({ e, s }) => (
                  <li key={e.id} className="flex justify-between gap-3 py-2 border-b last:border-0">
                    <span><span className="font-semibold">{s.prenom} {s.nom}</span><span className="block text-xs text-gray-500">{TYPES_ENTRETIEN[e.type]?.court} · {fr(e.date)}{e.responsable ? ` · ${e.responsable}` : ""}</span></span>
                    <span className="flex gap-3 items-center shrink-0">
                      <button type="button" onClick={() => ouvrirCr(e, s)} className="text-orange-600 font-semibold hover:underline">📝 Compte rendu</button>
                      {modifiable && e.statut === "PLANIFIE" && <button type="button" onClick={async () => { if (confirm("Supprimer cet entretien ?")) { await fetch(`/api/entretiens/${e.id}`, { method: "DELETE" }); charger(); } }} className="text-red-600">🗑️</button>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
