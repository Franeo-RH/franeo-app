"use client";

import { useEffect, useState } from "react";
import EchangeDemande from "@/components/EchangeDemande";
import type { MessageFil } from "@/components/FilMessages";
import type { PieceJointeVue } from "@/lib/devis";
import { STATUTS_DEMANDE } from "@/lib/apps-franeo";

export const RUBRIQUES_LIVRET = [
  "Mot d'accueil du dirigeant",
  "Présentation de l'entreprise (histoire, activité, valeurs)",
  "Organigramme et contacts utiles",
  "Horaires, temps de travail et pauses",
  "Congés, absences et arrêts maladie",
  "Paie, avantages et notes de frais",
  "Mutuelle et prévoyance",
  "Santé, sécurité et premiers secours",
  "Règlement intérieur et charte informatique",
  "Accès, plan des locaux et stationnement",
  "Formation et entretiens professionnels",
  "Représentants du personnel (CSE)",
];

type D = { id: string; statut: string; createdAt: string; options: string[]; message: string | null; reponse: string | null; type: string; messages?: MessageFil[]; piecesJointes?: PieceJointeVue[] };

/** Gestion RH › Livret d'accueil : le client le commande, FRANEO RH le rédige et le dépose dans l'app */
export default function LivretAccueilClient({ peutDemander }: { peutDemander: boolean }) {
  const [demandes, setDemandes] = useState<D[]>([]);
  const [choix, setChoix] = useState<string[]>(RUBRIQUES_LIVRET.slice(0, 9));
  const [infos, setInfos] = useState({ ton: "Chaleureux", charte: "", details: "" });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const charger = () => fetch("/api/demandes-services").then((r) => r.json()).then((l) => Array.isArray(l) && setDemandes(l.filter((d: D) => d.type === "LIVRET"))).catch(() => {});
  useEffect(() => { charger(); }, []);
  const enCours = demandes.some((d) => d.statut === "EN_ATTENTE" || d.statut === "EN_COURS");

  async function demander(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true); setMsg(null);
    const message = [`Ton souhaité : ${infos.ton}`, infos.charte && `Charte / couleurs : ${infos.charte}`, infos.details && `Informations : ${infos.details}`].filter(Boolean).join("\n");
    const r = await fetch("/api/demandes-services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "LIVRET", options: choix, message }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setEnvoi(false);
    setMsg(r?.ok ? { ok: true, t: "Demande envoyée à FRANEO RH. Vous serez prévenu par e-mail dès que votre livret sera déposé ici." } : { ok: false, t: d?.erreur || "Serveur injoignable." });
    if (r?.ok) charger();
  }

  return (
    <div className="flex flex-col gap-6">
      {demandes.map((d) => {
        const st = STATUTS_DEMANDE[d.statut] ?? STATUTS_DEMANDE.EN_ATTENTE;
        const docs = d.piecesJointes?.filter((p) => p.role === "ADMIN") ?? [];
        return (
          <div key={d.id} className="bg-white rounded-xl shadow p-6 flex flex-col gap-3">
            <div className="flex justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-bold">📘 Livret demandé le {new Date(d.createdAt).toLocaleDateString("fr-FR")}</h2>
              <span style={{ background: st.fond, color: st.texte, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{st.label}</span>
            </div>
            {docs.length > 0 ? (
              <div className="rounded-lg p-4" style={{ background: "#f0fdf4" }}>
                <p className="font-semibold text-green-800 mb-2">✅ Votre livret d&apos;accueil est prêt :</p>
                <ul className="flex flex-col gap-1">{docs.map((p) => <li key={p.id}><a href={`/api/pj/${p.id}`} className="text-orange-700 font-semibold hover:underline">📄 {p.nom}</a></li>)}</ul>
                <p className="text-xs text-gray-600 mt-2">Remettez-le à chaque nouvel arrivant (il fait partie de la checklist « Arrivées & départs »). Une correction ? Écrivez à FRANEO RH ci-dessous.</p>
              </div>
            ) : <p className="text-sm text-gray-500">FRANEO RH rédige votre livret avec les informations de votre entreprise ; il sera déposé ici.</p>}
            {d.reponse && <p className="text-sm" style={{ background: "#f0fdf4", borderRadius: 8, padding: "6px 10px" }}>💬 FRANEO RH : {d.reponse}</p>}
            <p className="text-xs text-gray-500">Rubriques : {d.options.join(" · ")}</p>
            <EchangeDemande moi="CLIENT" messages={d.messages ?? []} piecesJointes={d.piecesJointes ?? []} urlMessages={`/api/demandes-services/${d.id}/messages`} urlPj={`/api/demandes-services/${d.id}/pj`} onChange={charger} desactive={d.statut === "REFUSEE"}
              placeholder="Ajoutez une information, envoyez votre règlement intérieur, demandez une correction…" />
          </div>
        );
      })}

      {peutDemander && !enCours && (
        <form onSubmit={demander} className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
          <h2 className="text-lg font-bold">{demandes.length ? "🔄 Demander une nouvelle version" : "📝 Demander mon livret d'accueil"}</h2>
          <p className="text-sm text-gray-500">FRANEO RH le rédige à partir de vos informations (fiche entreprise, convention collective, mutuelle…) et le dépose ici, prêt à imprimer ou à envoyer à vos salariés.</p>
          <fieldset className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <legend className="text-sm font-semibold mb-2">Rubriques souhaitées</legend>
            {RUBRIQUES_LIVRET.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={choix.includes(r)} onChange={(e) => setChoix(e.target.checked ? [...choix, r] : choix.filter((x) => x !== r))} /> {r}</label>
            ))}
          </fieldset>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Ton
              <select value={infos.ton} onChange={(e) => setInfos({ ...infos, ton: e.target.value })} className="border rounded-lg px-3 py-2 text-sm"><option>Chaleureux</option><option>Professionnel</option><option>Décontracté</option></select></label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Couleurs / charte (facultatif)
              <input value={infos.charte} onChange={(e) => setInfos({ ...infos, charte: e.target.value })} placeholder="ex. bleu marine, logo sur la fiche" className="border rounded-lg px-3 py-2 text-sm" /></label>
          </div>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">Informations utiles
            <textarea rows={5} value={infos.details} onChange={(e) => setInfos({ ...infos, details: e.target.value })} placeholder="Histoire de l'entreprise, horaires, contacts, accès, avantages, règles particulières… Vous pourrez aussi joindre des documents après l'envoi." className="border rounded-lg px-3 py-2 text-sm font-normal" /></label>
          <button type="submit" disabled={envoi || choix.length === 0} className="bg-orange-500 text-white rounded-lg px-5 py-2 font-semibold self-start disabled:opacity-50">{envoi ? "Envoi…" : "📨 Envoyer la demande"}</button>
        </form>
      )}
      {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.ok ? "✅" : "❌"} {msg.t}</p>}
      {!peutDemander && demandes.length === 0 && <p className="text-sm text-gray-500">Demandez au dirigeant de votre entreprise de commander le livret d&apos;accueil.</p>}
    </div>
  );
}
