"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type FormuleAdmin = {
  type: "rh" | "paie"; id: string; nom: string; prixMensuel: number; inclus: number; prixSupp: number; tickets: number; prixTicket: number;
  clients: number; recommande?: boolean;
};

const eur = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;

/** Admin › Abonnements : une formule (prix, quantités, nombre de clients) avec ✏️ modifier et 🗑️ supprimer */
export default function CarteFormuleAdmin({ f, couleur, children }: { f: FormuleAdmin; couleur: string; children?: React.ReactNode }) {
  const router = useRouter();
  const [edition, setEdition] = useState(false);
  const [v, setV] = useState({ nom: f.nom, prixMensuel: String(f.prixMensuel), inclus: String(f.inclus), prixSupp: String(f.prixSupp), tickets: String(f.tickets), prixTicket: String(f.prixTicket) });
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const unite = f.type === "rh" ? "salarié" : "bulletin";

  async function enregistrer() {
    setEnvoi(true); setErreur(null);
    const r = await fetch("/api/admin/formules", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: f.type, id: f.id, ...v }) });
    setEnvoi(false);
    if (!r.ok) { setErreur((await r.json().catch(() => ({}))).erreur || "Erreur"); return; }
    setEdition(false); router.refresh();
  }
  async function supprimer() {
    if (!confirm(`Supprimer la formule ${f.nom} ?`)) return;
    const r = await fetch(`/api/admin/formules?type=${f.type}&id=${f.id}`, { method: "DELETE" });
    if (!r.ok) { alert((await r.json().catch(() => ({}))).erreur || "Suppression impossible"); return; }
    router.refresh();
  }

  const champ = (k: keyof typeof v, label: string, suffixe?: string) => (
    <label className="text-xs font-semibold text-gray-600">{label}
      <div className="flex items-center gap-1 mt-1">
        <input value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} inputMode={k === "nom" ? "text" : "decimal"} className="border rounded-lg px-2 py-1 w-full text-sm font-normal" />
        {suffixe && <span className="text-gray-400">{suffixe}</span>}
      </div>
    </label>
  );

  return (
    <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-3" style={{ borderTop: `4px solid ${couleur}` }}>
      {!edition ? (
        <>
          <div className="flex justify-between items-start gap-2">
            <div>
              {f.recommande && <span className="inline-block bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-1">⭐ Recommandée</span>}
              <p className="font-bold text-lg leading-tight">{f.nom}</p>
              <p className="text-2xl font-black text-orange-500">{eur(f.prixMensuel)}<span className="text-xs text-gray-400 font-normal"> / mois</span></p>
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={() => setEdition(true)} title="Modifier les prix" className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-500 hover:text-white">✏️</button>
              <button type="button" onClick={supprimer} title={f.clients ? "Des clients ont cette formule" : "Supprimer"} className="w-8 h-8 rounded-full border hover:bg-red-50">🗑️</button>
            </div>
          </div>
          <ul className="text-sm text-gray-700 flex flex-col gap-1">
            <li>👥 {f.inclus} {unite}s inclus · {eur(f.prixSupp)} / {unite} en plus</li>
            <li>🎫 {f.tickets ? `${f.tickets} ticket(s) RH / mois · ` : ""}{eur(f.prixTicket)} / ticket {f.tickets ? "en plus" : ""}</li>
            <li className="font-semibold">🏢 {f.clients} client(s)</li>
          </ul>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">{champ("nom", "Nom")}</div>
          {champ("prixMensuel", "Prix mensuel", "€")}
          {champ("inclus", `${unite[0].toUpperCase()}${unite.slice(1)}s inclus`)}
          {champ("prixSupp", `Prix par ${unite} en plus`, "€")}
          {f.type === "rh" && champ("tickets", "Tickets RH inclus / mois")}
          {champ("prixTicket", f.type === "rh" ? "Prix d'un ticket en plus" : "Prix d'un ticket RH / paie", "€")}
          {erreur && <p className="col-span-2 text-xs text-red-700">{erreur}</p>}
          <div className="col-span-2 flex gap-2">
            <button type="button" onClick={enregistrer} disabled={envoi} className="bg-orange-500 text-white rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50">{envoi ? "…" : "💾 Enregistrer"}</button>
            <button type="button" onClick={() => setEdition(false)} className="border rounded-lg px-3 py-1.5 text-sm">Annuler</button>
          </div>
          <p className="col-span-2 text-[11px] text-gray-400">Appliqué aux factures à partir du mois en cours.</p>
        </div>
      )}
      {children && (
        <details className="border-t pt-2">
          <summary className="text-sm font-semibold text-gray-600 cursor-pointer">👁️ Texte vu par le client</summary>
          <div className="mt-2">{children}</div>
        </details>
      )}
    </div>
  );
}

/** Nouvelle formule RH */
export function NouvelleFormuleRH() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [v, setV] = useState({ nom: "", prixMensuel: "", inclus: "25", prixSupp: "2", tickets: "0", prixTicket: "70" });
  const [erreur, setErreur] = useState<string | null>(null);
  async function creer() {
    setErreur(null);
    const r = await fetch("/api/admin/formules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "rh", ...v }) });
    if (!r.ok) { setErreur((await r.json().catch(() => ({}))).erreur || "Erreur"); return; }
    setOuvert(false); setV({ nom: "", prixMensuel: "", inclus: "25", prixSupp: "2", tickets: "0", prixTicket: "70" }); router.refresh();
  }
  if (!ouvert) return <button type="button" onClick={() => setOuvert(true)} className="rounded-xl border-2 border-dashed border-gray-300 text-gray-500 font-semibold p-5 hover:border-orange-400 hover:text-orange-600">➕ Nouvelle formule RH</button>;
  const c = (k: keyof typeof v, label: string) => (
    <label className="text-xs font-semibold text-gray-600">{label}<input value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} className="border rounded-lg px-2 py-1 w-full text-sm font-normal mt-1" /></label>
  );
  return (
    <div className="bg-white rounded-xl shadow p-5 grid grid-cols-2 gap-2">
      <div className="col-span-2">{c("nom", "Nom (ex. RH Entreprise)")}</div>
      {c("prixMensuel", "Prix mensuel (€)")}{c("inclus", "Salariés inclus")}{c("prixSupp", "€ / salarié en plus")}{c("tickets", "Tickets RH / mois")}{c("prixTicket", "€ / ticket en plus")}
      {erreur && <p className="col-span-2 text-xs text-red-700">{erreur}</p>}
      <div className="col-span-2 flex gap-2">
        <button type="button" onClick={creer} className="bg-orange-500 text-white rounded-lg px-3 py-1.5 text-sm font-semibold">Créer</button>
        <button type="button" onClick={() => setOuvert(false)} className="border rounded-lg px-3 py-1.5 text-sm">Annuler</button>
      </div>
    </div>
  );
}
