"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { telechargerExcel } from "@/components/telechargerExcel";

type L = { entrepriseId: string; entreprise: string; beneficiaire: string; source: string | null; pct: number; facture: number; encaisse: number; base: number; montant: number; versee: { montant: number; verseLe: string } | null };
const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export default function TableauCommissions({ lignes, mois, annee, base, libelleMois }: { lignes: L[]; mois: number; annee: number; base: string; libelleMois: string }) {
  const router = useRouter();
  async function verser(l: L, verse: boolean) {
    await fetch("/api/admin/commissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entrepriseId: l.entrepriseId, mois, annee, base, verse }) });
    router.refresh();
  }
  const parBenef = Object.entries(lignes.reduce<Record<string, number>>((a, l) => ({ ...a, [l.beneficiaire]: (a[l.beneficiaire] ?? 0) + l.montant }), {}));
  return (
    <div className="flex flex-col gap-4">
      {parBenef.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {parBenef.map(([b, m]) => <div key={b} className="rounded-lg px-4 py-2" style={{ background: "#f5f3ff" }}><p className="text-xs font-semibold text-gray-500">{b}</p><p className="text-lg font-bold" style={{ color: "#6d28d9" }}>{eur(m)}</p></div>)}
        </div>
      )}
      <table className="w-full text-sm text-left">
        <thead><tr className="text-gray-500 border-b"><th className="pb-2">Bénéficiaire</th><th className="pb-2">Client</th><th className="pb-2 text-right">Facturé</th><th className="pb-2 text-right">Encaissé</th><th className="pb-2 text-right">%</th><th className="pb-2 text-right">À reverser</th><th className="pb-2">Versement</th></tr></thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.entrepriseId} className="border-b last:border-0">
              <td data-label="Bénéficiaire" className="py-2 font-semibold">{l.beneficiaire}</td>
              <td data-label="Client" className="py-2"><Link href={`/admin/entreprises/${l.entrepriseId}?onglet=remises`} className="hover:text-orange-600">{l.entreprise}</Link></td>
              <td data-label="Facturé" className="py-2 text-right">{eur(l.facture)}</td>
              <td data-label="Encaissé" className="py-2 text-right">{eur(l.encaisse)}</td>
              <td data-label="%" className="py-2 text-right">{l.pct} %</td>
              <td data-label="À reverser" className="py-2 text-right font-bold" style={{ color: "#6d28d9" }}>{eur(l.montant)}</td>
              <td data-label="Versement" className="py-2">
                {l.versee
                  ? <span className="text-green-700 font-semibold">✅ {eur(l.versee.montant)} le {new Date(l.versee.verseLe).toLocaleDateString("fr-FR")} <button type="button" onClick={() => verser(l, false)} className="text-xs text-gray-500 underline ml-1">annuler</button></span>
                  : <button type="button" disabled={l.montant <= 0} onClick={() => verser(l, true)} className="text-sm font-semibold text-orange-600 hover:underline disabled:opacity-40">Marquer versé</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {lignes.length === 0 && <p className="text-sm text-gray-500">Aucune commission due pour {libelleMois}.</p>}
      {lignes.length > 0 && (
        <button type="button" className="self-start border border-green-600 text-green-700 rounded-lg px-4 py-2 font-semibold text-sm"
          onClick={() => telechargerExcel(`Commissions ${libelleMois}`, ["Bénéficiaire", "Client", "CA facturé", "CA encaissé", "Taux (%)", "À reverser", "Versé le"], lignes.map((l) => [l.beneficiaire, l.entreprise, l.facture, l.encaisse, l.pct, l.montant, l.versee ? new Date(l.versee.verseLe).toLocaleDateString("fr-FR") : ""]))}>📊 Exporter en Excel</button>
      )}
    </div>
  );
}
