"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { STATUTS_INSCRIPTION } from "@/lib/inscriptions";

type Demande = {
  id: string; societe: string; prenom: string; nom: string; email: string; telephone: string | null; effectif: string | null;
  besoins: string[]; message: string | null; type: string; statut: string; entrepriseId: string | null; createdAt: string;
};
type Formule = { id: string; nom: string; prixMensuel: number };

export default function NouveauxClients() {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [statut, setStatut] = useState("NOUVELLE");
  const [packs, setPacks] = useState<Formule[]>([]);
  const [formules, setFormules] = useState<Formule[]>([]);
  const [choix, setChoix] = useState<Record<string, { packId: string; formulePaieId: string }>>({});
  const [liens, setLiens] = useState<Record<string, string>>({});
  const [occupe, setOccupe] = useState(false);

  const charger = useCallback(async () => {
    const d = await fetch(`/api/inscriptions${statut ? `?statut=${statut}` : ""}`).then((r) => r.json()).catch(() => []);
    setDemandes(Array.isArray(d) ? d : []);
  }, [statut]);
  useEffect(() => { charger(); }, [charger]);
  useEffect(() => {
    fetch("/api/abonnements").then((r) => r.json()).then((d) => Array.isArray(d) && setPacks(d)).catch(() => {});
    fetch("/api/abonnement-paie").then((r) => r.json()).then((d) => Array.isArray(d) && setFormules(d)).catch(() => {});
  }, []);

  async function agir(d: Demande, action: "valider" | "refuser" | "rouvrir") {
    if (action === "valider" && !confirm(`Créer l'espace de ${d.societe} et le compte de ${d.prenom} ${d.nom} (${d.email}) ?`)) return;
    setOccupe(true);
    const res = await fetch(`/api/inscriptions/${d.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...(choix[d.id] || {}) }) });
    const r = await res.json().catch(() => ({}));
    setOccupe(false);
    if (!res.ok) { alert(r.erreur || "Erreur"); return; }
    if (r.lien) setLiens((l) => ({ ...l, [d.id]: r.lien }));
    charger();
  }

  async function supprimer(d: Demande) {
    if (!confirm("Supprimer cette demande ?")) return;
    await fetch(`/api/inscriptions/${d.id}`, { method: "DELETE" });
    charger();
  }

  const champ = "border rounded-lg px-3 py-2 text-sm";
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar role="ADMIN" prenom="" />
      <div className="flex">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-6 md:p-10 flex flex-col gap-6" style={{ minWidth: 0 }}>
          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-3xl font-bold">🆕 Nouveaux clients</h1>
            <p className="text-gray-500 mt-1">Demandes d&apos;accès et de contact envoyées depuis la démo et la page de connexion. Valider crée l&apos;entreprise et le compte client, puis vous donne le lien à transmettre pour choisir le mot de passe.</p>
            <div className="flex gap-2 mt-4 flex-wrap">
              {[["NOUVELLE", "🆕 À traiter"], ["VALIDEE", "✅ Validées"], ["REFUSEE", "Refusées"], ["", "Toutes"]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setStatut(v)} className={`px-3 py-1 rounded-full text-sm font-semibold ${statut === v ? "bg-orange-500 text-white" : "bg-white border text-gray-600"}`}>{l}</button>
              ))}
            </div>
          </div>

          {demandes.length === 0 ? <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">Aucune demande ici.</div> : demandes.map((d) => {
            const st = STATUTS_INSCRIPTION[d.statut] || STATUTS_INSCRIPTION.NOUVELLE;
            const c = choix[d.id] || { packId: "", formulePaieId: "" };
            return (
              <div key={d.id} className="bg-white rounded-xl shadow p-5">
                <div className="flex justify-between gap-3 flex-wrap items-start">
                  <div>
                    <p className="text-lg font-bold">{d.societe} <span className="text-xs font-semibold text-gray-500">· {d.type === "CONTACT" ? "✉️ contact" : "🚀 inscription"}</span></p>
                    <p className="text-sm">{d.prenom} {d.nom} · <a href={`mailto:${d.email}`} className="text-orange-600">{d.email}</a>{d.telephone ? <> · <a href={`tel:${d.telephone}`} className="text-orange-600">{d.telephone}</a></> : ""}</p>
                    <p className="text-xs text-gray-500">Reçue le {new Date(d.createdAt).toLocaleString("fr-FR")}{d.effectif ? ` · ${d.effectif} salariés` : ""}</p>
                  </div>
                  <span style={{ background: st.fond, color: st.texte, borderRadius: "999px", padding: "4px 12px", fontSize: "12px", fontWeight: 700 }}>{st.label}</span>
                </div>
                {d.besoins.length > 0 && <div className="flex gap-1 flex-wrap mt-2">{d.besoins.map((b) => <span key={b} className="text-xs bg-orange-50 text-orange-700 rounded-full px-2 py-0.5 font-semibold">{b}</span>)}</div>}
                {d.message && <p className="text-sm text-gray-700 mt-2" style={{ whiteSpace: "pre-line" }}>💬 {d.message}</p>}

                {d.statut === "NOUVELLE" && (
                  <div className="mt-4 flex gap-2 flex-wrap items-center">
                    <select className={champ} value={c.packId} onChange={(e) => setChoix({ ...choix, [d.id]: { ...c, packId: e.target.value } })} aria-label="Pack RH">
                      <option value="">Pack RH : aucun (accès de base gratuit)</option>
                      {packs.map((p) => <option key={p.id} value={p.id}>{p.nom} — {p.prixMensuel} €</option>)}
                    </select>
                    <select className={champ} value={c.formulePaieId} onChange={(e) => setChoix({ ...choix, [d.id]: { ...c, formulePaieId: e.target.value } })} aria-label="Formule paie">
                      <option value="">Formule paie : aucune</option>
                      {formules.map((p) => <option key={p.id} value={p.id}>{p.nom} — {p.prixMensuel} €</option>)}
                    </select>
                    <button type="button" disabled={occupe} onClick={() => agir(d, "valider")} style={{ background: "#16a34a", color: "#ffffff", border: "none", borderRadius: "8px", padding: "8px 14px", fontWeight: 700, cursor: "pointer" }}>✅ Valider et créer l&apos;accès</button>
                    <button type="button" disabled={occupe} onClick={() => agir(d, "refuser")} style={{ background: "#ffffff", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: "8px", padding: "8px 14px", fontWeight: 700, cursor: "pointer" }}>Refuser</button>
                  </div>
                )}
                {liens[d.id] && (
                  <div className="mt-3 rounded-lg p-3" style={{ background: "#dcfce7" }}>
                    <p className="text-sm font-semibold mb-2">✅ Accès créé. Transmettez ce lien au client (valable 7 jours) :</p>
                    <div className="flex gap-2 flex-wrap">
                      <input readOnly value={liens[d.id]} onFocus={(e) => e.target.select()} className="border rounded px-2 py-1 text-xs flex-1" style={{ minWidth: "200px" }} aria-label="Lien d'accès" />
                      <button type="button" onClick={() => navigator.clipboard?.writeText(liens[d.id])} className="bg-gray-900 text-white rounded px-3 py-1 text-sm font-semibold">📋 Copier</button>
                    </div>
                  </div>
                )}
                <div className="mt-3 flex gap-3 text-sm">
                  {d.entrepriseId && <Link href={`/admin/entreprises/${d.entrepriseId}`} className="text-orange-600 font-semibold">Ouvrir la fiche entreprise →</Link>}
                  {d.statut === "REFUSEE" && <button type="button" onClick={() => agir(d, "rouvrir")} className="text-gray-600 underline">Remettre à traiter</button>}
                  <button type="button" onClick={() => supprimer(d)} className="text-red-600">🗑️ Supprimer</button>
                </div>
              </div>
            );
          })}
        </main>
      </div>
    </div>
  );
}
