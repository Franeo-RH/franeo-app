"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MODELES_METIER, STATUTS_DEVIS } from "@/lib/projets-constantes";
import { couleurMarge, dateFR, eur, pct, Tuile } from "./outils";

type Devis = { id: string; numero: string; objet: string; client: string | null; statut: string; totalHT: number; coutTotal: number; supplementaire: boolean; createdAt: string; envoyeLe: string | null; accepteLe: string | null; validiteJours: number; projet: { id: string; nom: string } | null };

export default function ListeDevis() {
  const router = useRouter();
  const [d, setD] = useState<{ devis: Devis[]; peutGerer: boolean } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState("");
  const [nouveau, setNouveau] = useState({ objet: "", client: "", modele: "LIBRE" });
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => { fetch("/api/projets/devis").then(async (r) => { const j = await r.json().catch(() => ({})); if (r.ok) setD(j); else setErreur(j.erreur || "Chargement impossible"); }); }, []);
  if (erreur) return <div className="bg-white rounded-xl shadow p-6 text-red-700">{erreur}</div>;
  if (!d) return <div className="bg-white rounded-xl shadow p-6 text-gray-500">Chargement…</div>;

  const liste = d.devis.filter((x) => !filtre || x.statut === filtre);
  const somme = (st: string) => d.devis.filter((x) => x.statut === st).reduce((t, x) => t + x.totalHT, 0);
  const decides = d.devis.filter((x) => x.statut === "ACCEPTE" || x.statut === "REFUSE");
  const transfo = decides.length ? Math.round((d.devis.filter((x) => x.statut === "ACCEPTE").length / decides.length) * 100) : null;
  const expire = (x: Devis) => x.statut === "ENVOYE" && x.envoyeLe && new Date(x.envoyeLe).getTime() + x.validiteJours * 86400000 < Date.now();

  async function creer(e: React.FormEvent) {
    e.preventDefault(); setEnvoi(true);
    const r = await fetch("/api/projets/devis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nouveau) });
    const j = await r.json().catch(() => ({}));
    setEnvoi(false);
    if (r.ok) router.push(`/client/projets/devis/${j.id}`); else setErreur(j.erreur || "Création impossible");
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tuile titre="Devis en attente de réponse" valeur={eur(somme("ENVOYE"))} detail={`${d.devis.filter((x) => x.statut === "ENVOYE").length} devis envoyé(s)`} />
        <Tuile titre="Devis acceptés" valeur={eur(somme("ACCEPTE"))} couleur="#15803d" />
        <Tuile titre="Taux de transformation" valeur={transfo == null ? "—" : `${transfo} %`} detail="acceptés ÷ (acceptés + refusés)" />
        <Tuile titre="Brouillons" valeur={String(d.devis.filter((x) => x.statut === "BROUILLON").length)} />
      </div>

      {d.peutGerer && (
        <form onSubmit={creer} className="bg-white rounded-xl shadow p-6 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <h2 className="text-xl font-bold md:col-span-4">➕ Nouveau devis</h2>
          <label className="text-sm font-semibold md:col-span-2">Objet *<input required value={nouveau.objet} onChange={(e) => setNouveau({ ...nouveau, objet: e.target.value })} placeholder="Ex. Rénovation salle de bain, Audit RH…" className="border rounded-lg px-3 py-2 w-full" /></label>
          <label className="text-sm font-semibold">Client<input value={nouveau.client} onChange={(e) => setNouveau({ ...nouveau, client: e.target.value })} className="border rounded-lg px-3 py-2 w-full" /></label>
          <label className="text-sm font-semibold">Métier (préremplit les lignes)
            <select value={nouveau.modele} onChange={(e) => setNouveau({ ...nouveau, modele: e.target.value })} className="border rounded-lg px-3 py-2 w-full">
              {Object.entries(MODELES_METIER).map(([k, m]) => <option key={k} value={k}>{m.icone} {m.label}</option>)}
            </select>
          </label>
          <p className="text-xs text-gray-500 md:col-span-3">{MODELES_METIER[nouveau.modele]?.conseil}</p>
          <button type="submit" disabled={envoi} className="bg-black text-white px-5 py-2 rounded-lg font-semibold">{envoi ? "Création…" : "Créer et chiffrer"}</button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow p-4 flex gap-3 items-center">
        <select value={filtre} onChange={(e) => setFiltre(e.target.value)} className="border rounded-lg px-3 py-2">
          <option value="">Tous les devis</option>
          {Object.entries(STATUTS_DEVIS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="p-3">Numéro</th><th className="p-3">Objet</th><th className="p-3">Client</th><th className="p-3">Date</th><th className="p-3">Statut</th><th className="p-3">Montant HT</th><th className="p-3">Marge</th><th className="p-3">Projet</th></tr></thead>
          <tbody>
            {liste.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-gray-500">Aucun devis.</td></tr>}
            {liste.map((x) => {
              const s = STATUTS_DEVIS[x.statut as keyof typeof STATUTS_DEVIS];
              const tm = x.totalHT > 0 ? Math.round(((x.totalHT - x.coutTotal) / x.totalHT) * 1000) / 10 : null;
              return (
                <tr key={x.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/client/projets/devis/${x.id}`)}>
                  <td className="p-3 font-semibold whitespace-nowrap">{x.numero}</td>
                  <td className="p-3">{x.objet}{x.supplementaire && <span className="ml-2 text-xs font-semibold text-purple-700">travaux supp.</span>}</td>
                  <td className="p-3">{x.client ?? "—"}</td>
                  <td className="p-3 whitespace-nowrap">{dateFR(x.createdAt)}</td>
                  <td className="p-3"><span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: `${s?.couleur}1a`, color: s?.couleur }}>{s?.label}</span>{expire(x) && <span className="ml-1 text-xs text-red-700">expiré</span>}</td>
                  <td className="p-3 whitespace-nowrap">{eur(x.totalHT)}</td>
                  <td className="p-3 font-semibold" style={{ color: couleurMarge(tm) }}>{pct(tm)}</td>
                  <td className="p-3">{x.projet ? <Link href={`/client/projets/${x.projet.id}`} onClick={(e) => e.stopPropagation()} className="underline">{x.projet.nom}</Link> : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
