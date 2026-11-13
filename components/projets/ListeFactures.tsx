"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { STATUTS_FACTURE, TYPES_FACTURE } from "@/lib/projets-constantes";
import { dateFR, eur, Tuile } from "./outils";

type F = { id: string; numero: string; type: string; date: string; echeance: string; totalHT: number; totalTTC: number; statut: string; payeeLe: string | null; relances: number; derniereRelance: string | null; projet: { id: string; nom: string; client: string | null; couleur: string } };

/** Liste des factures (toutes, ou celles d'un projet) avec encaissement et relances */
export default function ListeFactures({ projetId, compact = false, rafraichir = 0, onChange }: { projetId?: string; compact?: boolean; rafraichir?: number; onChange?: () => void }) {
  const [d, setD] = useState<{ factures: F[]; peutGerer: boolean } | null>(null);
  const [filtre, setFiltre] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const r = await fetch(`/api/projets/factures${projetId ? `?projetId=${projetId}` : ""}`);
    if (r.ok) setD(await r.json());
  }, [projetId]);
  useEffect(() => { charger(); }, [charger, rafraichir]);

  async function action(f: F, a: string, question?: string) {
    if (question && !confirm(question)) return;
    const r = await fetch(`/api/projets/factures/${f.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: a }) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? null : `❌ ${j.erreur || "Action impossible"}`);
    await charger(); onChange?.();
  }
  function relancer(f: F) {
    const sujet = `Relance — facture ${f.numero}`;
    const corps = `Bonjour,\n\nSauf erreur de notre part, la facture ${f.numero} du ${dateFR(f.date)} d'un montant de ${eur(f.totalTTC)} TTC, arrivée à échéance le ${dateFR(f.echeance)}, reste impayée.\n\nPourriez-vous procéder à son règlement dans les meilleurs délais ? Si le paiement a été effectué entre-temps, merci de ne pas tenir compte de ce message.\n\nCordialement`;
    window.open(`mailto:?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`);
    action(f, "relance");
  }

  if (!d) return <div className="bg-white rounded-xl shadow p-6 text-gray-500">Chargement des factures…</div>;
  const auj = Date.now();
  const enRetard = (f: F) => f.statut === "EMISE" && new Date(f.echeance).getTime() < auj;
  const liste = d.factures.filter((f) => !filtre || (filtre === "RETARD" ? enRetard(f) : f.statut === filtre));
  const moisCourant = new Date().toISOString().slice(0, 7);
  const somme = (l: F[]) => l.reduce((t, f) => t + f.totalTTC, 0);

  return (
    <>
      {!compact && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Tuile titre="À encaisser (TTC)" valeur={eur(somme(d.factures.filter((f) => f.statut === "EMISE")))} />
          <Tuile titre="En retard de paiement" valeur={eur(somme(d.factures.filter(enRetard)))} couleur={d.factures.some(enRetard) ? "#b91c1c" : "#15803d"} detail={`${d.factures.filter(enRetard).length} facture(s)`} />
          <Tuile titre="Encaissé ce mois" valeur={eur(somme(d.factures.filter((f) => f.statut === "PAYEE" && (f.payeeLe ?? "").startsWith(moisCourant))))} />
          <Tuile titre="Facturé ce mois (HT)" valeur={eur(d.factures.filter((f) => f.statut !== "ANNULEE" && f.date.startsWith(moisCourant)).reduce((t, f) => t + f.totalHT, 0))} />
        </div>
      )}
      {!compact && (
        <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-center">
          <select value={filtre} onChange={(e) => setFiltre(e.target.value)} className="border rounded-lg px-3 py-2">
            <option value="">Toutes les factures</option><option value="RETARD">En retard de paiement</option>
            {Object.entries(STATUTS_FACTURE).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
          <a href="/api/projets/factures?format=csv" className="border rounded-lg px-4 py-2 font-semibold">📥 Export pour la comptabilité</a>
          <p className="text-sm text-gray-500">Pour créer une facture, ouvrez le projet › Facturation.</p>
        </div>
      )}
      {msg && <p className="text-sm font-semibold text-red-700">{msg}</p>}
      <div className={compact ? "overflow-x-auto" : "bg-white rounded-xl shadow overflow-x-auto"}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="p-2">N°</th>{!projetId && <th className="p-2">Projet / client</th>}<th className="p-2">Type</th><th className="p-2">Date</th><th className="p-2">Échéance</th><th className="p-2 text-right">HT</th><th className="p-2 text-right">TTC</th><th className="p-2">Statut</th><th className="p-2" /></tr></thead>
          <tbody>
            {liste.length === 0 && <tr><td colSpan={9} className="p-4 text-center text-gray-500">Aucune facture.</td></tr>}
            {liste.map((f) => {
              const s = STATUTS_FACTURE[f.statut as keyof typeof STATUTS_FACTURE];
              return (
                <tr key={f.id} className="border-t" style={{ opacity: f.statut === "ANNULEE" ? 0.5 : 1 }}>
                  <td className="p-2 font-semibold whitespace-nowrap">{f.numero}</td>
                  {!projetId && <td className="p-2"><Link href={`/client/projets/${f.projet.id}`} className="underline">{f.projet.nom}</Link>{f.projet.client && <span className="block text-xs text-gray-500">{f.projet.client}</span>}</td>}
                  <td className="p-2">{TYPES_FACTURE[f.type as keyof typeof TYPES_FACTURE] ?? f.type}</td>
                  <td className="p-2 whitespace-nowrap">{dateFR(f.date)}</td>
                  <td className="p-2 whitespace-nowrap" style={{ color: enRetard(f) ? "#b91c1c" : undefined, fontWeight: enRetard(f) ? 700 : undefined }}>{dateFR(f.echeance)}{enRetard(f) && " ⚠️"}</td>
                  <td className="p-2 text-right whitespace-nowrap">{eur(f.totalHT)}</td>
                  <td className="p-2 text-right whitespace-nowrap">{eur(f.totalTTC)}</td>
                  <td className="p-2 whitespace-nowrap"><span className="text-xs font-semibold" style={{ color: s?.couleur }}>{s?.label}</span>{f.relances > 0 && <span className="block text-xs text-gray-500">{f.relances} relance(s)</span>}</td>
                  <td className="p-2 whitespace-nowrap text-right">
                    <a href={`/client/projets/factures/${f.id}/imprimer`} target="_blank" rel="noreferrer" className="underline mr-2">PDF</a>
                    {d.peutGerer && f.statut === "EMISE" && <button type="button" onClick={() => action(f, "payee")} className="text-green-700 font-semibold underline mr-2">Payée</button>}
                    {d.peutGerer && enRetard(f) && <button type="button" onClick={() => relancer(f)} className="text-orange-700 font-semibold underline mr-2">Relancer</button>}
                    {d.peutGerer && f.statut === "PAYEE" && <button type="button" onClick={() => action(f, "nonPayee")} className="text-gray-600 underline mr-2">Non payée</button>}
                    {d.peutGerer && f.statut === "EMISE" && <button type="button" onClick={() => action(f, "annuler", "Annuler cette facture (erreur de saisie) ? Une facture déjà envoyée au client se corrige plutôt par un avoir.")} className="text-red-700 underline">Annuler</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
