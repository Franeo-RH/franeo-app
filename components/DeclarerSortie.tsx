"use client";

// Paie › Déclarer une sortie : motif, dates, préavis, éléments de paie de fin de contrat ; historique des sorties.

import { useCallback, useEffect, useState } from "react";
import { DOCUMENTS_FIN_CONTRAT, MOTIFS_SORTIE, PREAVIS } from "@/lib/sorties";

type Salarie = { id: string; prenom: string; nom: string; poste: string; typeContrat: string | null; dateDebut: string | null; dateFin: string | null };
type Sortie = { id: string; statut: string; resume: string; motifRefus: string | null; createdAt: string; auteur: string | null };
type Conges = { reste: number; enCours?: { acquis?: number } | null; regle?: { caisse?: boolean } } | null;

const STATUTS: Record<string, { label: string; fond: string; texte: string }> = {
  EN_ATTENTE: { label: "⏳ En attente de validation", fond: "#fff7ed", texte: "#c2410c" },
  VALIDEE: { label: "✅ Enregistrée", fond: "#dcfce7", texte: "#15803d" },
  REFUSEE: { label: "❌ Refusée", fond: "#fee2e2", texte: "#b91c1c" },
};
const jours = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} j`;

export default function DeclarerSortie() {
  const vide = { salarieId: "", motif: "", notification: "", dernierJour: "", dateFin: "", preavis: "", elements: "", commentaire: "" };
  const [f, setF] = useState(vide);
  const [d, setD] = useState<{ salaries: Salarie[]; sorties: Sortie[]; validation: boolean } | null>(null);
  const [conges, setConges] = useState<Conges>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    const r = await fetch("/api/paie/sorties");
    const j = await r.json().catch(() => ({}));
    if (r.ok) setD(j); else setMsg({ ok: false, t: j.erreur || "Chargement impossible" });
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const salarie = d?.salaries.find((s) => s.id === f.salarieId) ?? null;
  useEffect(() => {
    setConges(null);
    if (!f.salarieId) return;
    fetch(`/api/salaries/${f.salarieId}/conges`).then((r) => (r.ok ? r.json() : null)).then(setConges).catch(() => {});
    // CDD : date de fin déjà connue
    const s = d?.salaries.find((x) => x.id === f.salarieId);
    if (s?.dateFin) setF((x) => ({ ...x, dateFin: x.dateFin || s.dateFin!.slice(0, 10) }));
  }, [f.salarieId]); // eslint-disable-line react-hooks/exhaustive-deps

  const motif = MOTIFS_SORTIE.find((m) => m.code === f.motif);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!salarie) return;
    if (!confirm(`Déclarer la sortie de ${salarie.prenom} ${salarie.nom} au ${new Date(`${f.dateFin}T12:00:00`).toLocaleDateString("fr-FR")} ?`)) return;
    setEnvoi(true); setMsg(null);
    const r = await fetch("/api/paie/sorties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const j = await r.json().catch(() => ({}));
    setEnvoi(false);
    if (!r.ok) { setMsg({ ok: false, t: j.erreur || "Erreur" }); return; }
    setMsg({ ok: true, t: j.validation ? "✅ Sortie transmise à FRANEO RH : elle sera prise en compte dans la paie dès sa validation." : "✅ Sortie enregistrée : la date de fin est sur la fiche du salarié et FRANEO RH a été prévenu." });
    setF(vide); setConges(null); charger();
  }

  const label = "text-sm font-semibold";
  const input = "mt-1 w-full border rounded-lg px-3 py-2 font-normal";

  return (
    <>
      <form onSubmit={envoyer} className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className={label}>Salarié *
            <select required value={f.salarieId} onChange={(e) => setF({ ...f, salarieId: e.target.value, dateFin: "" })} className={input}>
              <option value="">— Choisir —</option>
              {d?.salaries.map((s) => <option key={s.id} value={s.id}>{s.nom} {s.prenom} · {s.poste}{s.typeContrat ? ` (${s.typeContrat})` : ""}</option>)}
            </select>
          </label>
          <label className={label}>Motif de la sortie *
            <select required value={f.motif} onChange={(e) => setF({ ...f, motif: e.target.value })} className={input}>
              <option value="">— Choisir —</option>
              {MOTIFS_SORTIE.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
            </select>
          </label>
          <label className={label}>{f.motif === "DEMISSION" ? "Démission reçue le" : f.motif === "RUPTURE_CONVENTIONNELLE" ? "Date d'homologation" : "Date de notification"}
            <input type="date" value={f.notification} onChange={(e) => setF({ ...f, notification: e.target.value })} className={input} />
          </label>
          <label className={label}>Préavis
            <select value={f.preavis} onChange={(e) => setF({ ...f, preavis: e.target.value })} className={input}>
              <option value="">—</option>
              {Object.entries(PREAVIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className={label}>Dernier jour travaillé
            <input type="date" value={f.dernierJour} onChange={(e) => setF({ ...f, dernierJour: e.target.value })} className={input} />
          </label>
          <label className={label}>Date de fin du contrat *
            <input type="date" required value={f.dateFin} onChange={(e) => setF({ ...f, dateFin: e.target.value })} className={input} />
            <span className="block text-xs font-normal text-gray-500 mt-1">Dernier jour du contrat, préavis compris (même s&apos;il n&apos;est pas effectué).</span>
          </label>
        </div>

        {salarie && (
          <div className="rounded-lg p-4 text-sm grid gap-2 md:grid-cols-2" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
            <p>📅 Entré(e) le <strong>{salarie.dateDebut ? new Date(salarie.dateDebut).toLocaleDateString("fr-FR") : "—"}</strong>{salarie.typeContrat ? ` · ${salarie.typeContrat}` : ""}</p>
            <p>🌴 Congés : {conges ? <><strong>{jours(conges.reste)}</strong> à prendre{conges.enCours?.acquis ? <> + <strong>{jours(conges.enCours.acquis)}</strong> en cours d&apos;acquisition</> : null}{conges.regle?.caisse ? " (caisse de congés BTP)" : ""}</> : "…"}</p>
            {motif?.documents && <p className="md:col-span-2">📎 À transmettre à FRANEO RH : <strong>{motif.documents}</strong> (par ticket ou dans les documents du salarié).</p>}
          </div>
        )}

        <label className={label}>Éléments de paie de fin de contrat
          <textarea value={f.elements} onChange={(e) => setF({ ...f, elements: e.target.value })} rows={2} className={input} placeholder="Ex. : prime au prorata, heures supplémentaires du mois, indemnité spécifique de rupture négociée, avance à retenir…" />
        </label>
        <label className={label}>Commentaire
          <textarea value={f.commentaire} onChange={(e) => setF({ ...f, commentaire: e.target.value })} rows={2} className={input} />
        </label>

        <div className="text-sm text-gray-600">
          <p className="font-semibold">La paie prépare ensuite :</p>
          <ul className="list-disc ml-5">{DOCUMENTS_FIN_CONTRAT.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
        {d?.validation && <p className="text-sm rounded-lg p-3" style={{ background: "#eff6ff", color: "#1e3a8a" }}>💡 Votre paie est gérée par FRANEO RH : la sortie est envoyée pour validation, puis appliquée sur la fiche du salarié.</p>}
        {msg && <p className="text-sm font-semibold" style={{ color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.t}</p>}
        <button type="submit" disabled={envoi || !f.salarieId || !f.motif || !f.dateFin} className="self-start bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-40">{envoi ? "Envoi…" : "🚪 Déclarer la sortie"}</button>
      </form>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold mb-3">📋 Sorties déclarées</h2>
        {!d?.sorties.length ? <p className="text-gray-500">Aucune sortie déclarée pour le moment.</p> : (
          <ul className="divide-y">
            {d.sorties.map((s) => {
              const st = STATUTS[s.statut] ?? STATUTS.EN_ATTENTE;
              return (
                <li key={s.id} className="py-3 flex justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold">{s.resume}</p>
                    <p className="text-xs text-gray-500">Déclarée le {new Date(s.createdAt).toLocaleDateString("fr-FR")}{s.auteur ? ` par ${s.auteur.split(" (")[0]}` : ""}</p>
                    {s.motifRefus && <p className="text-sm text-red-700">Motif du refus : {s.motifRefus}</p>}
                  </div>
                  <span className="self-start rounded-full px-3 py-1 text-xs font-bold" style={{ background: st.fond, color: st.texte }}>{st.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
