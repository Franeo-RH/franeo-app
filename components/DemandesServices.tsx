"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { APPS_FRANEO, appFraneo, MODULES_FORMATION, prixRemise, REMISE_APPS, REMISE_AUDIT, STATUTS_DEMANDE, TYPES_DEMANDE } from "@/lib/apps-franeo";

type Demande = { id: string; type: string; app: string | null; options: string[]; message: string | null; remise: number; statut: string; reponse: string | null; createdAt: string };
type Onglet = "APP" | "AUDIT" | "FORMATION" | "AUTRE";

const prix = (p: number | null, unite = "", remise = 0) =>
  p === null ? "Sur devis" : p === 0 ? "Inclus" : remise ? <><s className="text-gray-400 mr-1">{p} €</s><strong>{prixRemise(p, remise)} €{unite}</strong></> : <strong>{p} €{unite}</strong>;

/** Mon entreprise › Autres apps & demandes : accès aux apps Franeo, audit RH, formation, autre besoin */
export default function DemandesServices({ abonne, typeInitial, appInitiale, seul }: { abonne: boolean; typeInitial?: string; appInitiale?: string; seul?: Onglet }) {
  const [onglet, setOnglet] = useState<Onglet>(seul ?? ((["APP", "AUDIT", "FORMATION", "AUTRE"].includes(typeInitial || "") ? typeInitial : "APP") as Onglet));
  const [app, setApp] = useState(appInitiale && appFraneo(appInitiale) ? appInitiale : APPS_FRANEO[0].code);
  const [choix, setChoix] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [historique, setHistorique] = useState<Demande[]>([]);
  const [retour, setRetour] = useState<{ ok: boolean; t: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    const d = await fetch("/api/demandes-services").then((r) => r.json()).catch(() => []);
    setHistorique(Array.isArray(d) ? d : []);
  }, []);
  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { setChoix([]); setRetour(null); }, [onglet, app]);

  const basculer = (c: string) => setChoix((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));
  const a = appFraneo(app)!;
  const remiseApp = abonne ? REMISE_APPS : 0;

  async function envoyer() {
    setEnvoi(true); setRetour(null);
    const res = await fetch("/api/demandes-services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: onglet, app: onglet === "APP" ? app : undefined, options: choix, message }) });
    const d = await res.json().catch(() => ({}));
    setEnvoi(false);
    setRetour(res.ok ? { ok: true, t: "✅ Demande envoyée : FRANEO RH revient vers vous rapidement." } : { ok: false, t: d.erreur || "Erreur" });
    if (res.ok) { setChoix([]); setMessage(""); charger(); }
  }

  const coche = (c: string, contenu: React.ReactNode) => (
    <label key={c} className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer ${choix.includes(c) ? "border-orange-500 bg-orange-50" : ""}`}>
      <input type="checkbox" checked={choix.includes(c)} onChange={() => basculer(c)} className="mt-1" />
      <span className="flex-1 text-sm">{contenu}</span>
    </label>
  );

  const ONGLETS: { id: Onglet; label: string }[] = [
    { id: "APP", label: "📱 Accès à une autre app" },
    { id: "AUDIT", label: "🔍 Audit RH" },
    { id: "FORMATION", label: "🎓 Formation" },
    { id: "AUTRE", label: "✍️ Autre demande" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {!seul && <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">📱 Autres apps & demandes</h1>
        <p className="text-gray-500 mt-1">Découvrez les autres applications Franeo, demandez un accès, un audit RH, une formation ou décrivez tout autre besoin.</p>
        {abonne && <p className="mt-2 text-sm font-semibold text-green-700">🎁 Client abonné : −{Math.round(REMISE_APPS * 100)} % sur les abonnements des autres apps et −{Math.round(REMISE_AUDIT * 100)} % sur l&apos;audit RH.</p>}
      </div>}

      {/* Boutons vers les apps */}
      {!seul && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
        {APPS_FRANEO.map((x) => (
          <a key={x.code} href={x.url} target="_blank" rel="noopener noreferrer" className="rounded-xl p-4 flex items-center gap-3 shadow hover:shadow-md transition" style={{ background: "#ffffff", borderTop: `5px solid ${x.couleur}` }}>
            <span style={{ width: 48, height: 48, borderRadius: 12, background: x.fond, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Image src={x.logo} alt="" width={36} height={36} style={{ objectFit: "contain" }} />
            </span>
            <span><span className="block font-bold" style={{ color: x.couleur }}>{x.nom}</span><span className="block text-xs text-gray-500">Visiter ↗</span></span>
          </a>
        ))}
      </div>}

      {!seul && <div className="flex gap-2 flex-wrap">
        {ONGLETS.map((o) => (
          <button key={o.id} type="button" onClick={() => setOnglet(o.id)} className={`px-5 py-2 rounded-lg font-semibold transition ${onglet === o.id ? "bg-orange-500 text-white" : "bg-white text-black hover:bg-gray-100"}`}>{o.label}</button>
        ))}
      </div>}

      <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
        {onglet === "APP" && (
          <>
            <h2 className="text-xl font-bold">Demander un accès</h2>
            <div className="flex gap-2 flex-wrap">
              {APPS_FRANEO.map((x) => (
                <button key={x.code} type="button" onClick={() => setApp(x.code)} className="px-4 py-2 rounded-lg font-semibold" style={app === x.code ? { background: x.couleur, color: "#ffffff" } : { background: x.fond, color: x.couleur }}>{x.nom}</button>
              ))}
            </div>
            <p className="text-gray-600">{a.description}</p>
            <h3 className="font-bold" style={{ color: a.couleur }}>Formules</h3>
            <div className="grid gap-2">
              {a.formules.map((f) => coche(`Formule ${f.nom}`, <>
                <span className="flex justify-between gap-2 flex-wrap"><strong>{f.nom}</strong><span>{prix(f.prix, f.unite, f.prix ? remiseApp : 0)}</span></span>
                <span className="block text-gray-500">{f.details.join(" · ")}</span>
              </>))}
            </div>
            {a.options.length > 0 && (
              <>
                <h3 className="font-bold" style={{ color: a.couleur }}>Options</h3>
                <div className="grid gap-2">
                  {a.options.map((o) => coche(o.libelle, <span className="flex justify-between gap-2 flex-wrap"><span>{o.libelle}</span><span>{prix(o.prix, o.unite ? ` ${o.unite}` : "")}</span></span>))}
                </div>
              </>
            )}
            {remiseApp > 0 && <p className="text-sm text-green-700 font-semibold">Remise abonné de {Math.round(remiseApp * 100)} % appliquée sur les abonnements.</p>}
          </>
        )}
        {onglet === "AUDIT" && (
          <>
            <h2 className="text-xl font-bold">🔍 Demander un audit RH</h2>
            <p className="text-gray-600">Un état des lieux complet de votre gestion RH : dossiers du personnel, obligations légales, affichages, registres, contrats, suivi médical, paie. Vous recevez un rapport et un plan d&apos;action priorisé.</p>
            <p className="text-sm font-semibold">Tarif : sur devis selon votre effectif{abonne ? <span className="text-green-700"> — remise abonné de {Math.round(REMISE_AUDIT * 100)} %</span> : ""}.</p>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
              {["Audit complet", "Dossiers du personnel", "Obligations légales & affichages", "Contrats & avenants", "Paie & variables", "Santé au travail"].map((c) => coche(c, c))}
            </div>
          </>
        )}
        {onglet === "FORMATION" && (
          <>
            <h2 className="text-xl font-bold">🎓 Demander une formation</h2>
            <p className="text-gray-600">Modules FRANEO RH, à suivre seuls ou combinés, en présentiel ou en visio. Après la formation, vos participants retrouvent les ressources dans Franeo Training.</p>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
              {MODULES_FORMATION.map((m) => coche(m, m))}
            </div>
            <div className="flex gap-2 flex-wrap">{["Présentiel", "Visio"].map((m) => coche(m, m))}</div>
          </>
        )}
        {onglet === "AUTRE" && (
          <>
            <h2 className="text-xl font-bold">✍️ Autre demande</h2>
            <p className="text-gray-600">Décrivez votre besoin : nous revenons vers vous avec une proposition ou un devis.</p>
          </>
        )}
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={4000} placeholder={onglet === "AUTRE" ? "Votre besoin…" : onglet === "FORMATION" ? "Nombre de participants, dates souhaitées, lieu…" : "Précisions (facultatif)"} className="border rounded-lg px-4 py-3" aria-label="Message" />
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <p className="text-sm font-semibold" style={{ color: retour?.ok ? "#15803d" : "#b91c1c" }}>{retour?.t}</p>
          <button type="button" disabled={envoi || (onglet === "AUTRE" ? !message.trim() : onglet === "APP" ? choix.length === 0 : false)} onClick={envoyer}
            className="px-6 py-3 rounded-lg font-bold text-white" style={{ background: onglet === "APP" ? a.couleur : onglet === "FORMATION" ? "#17a34a" : "#f97316", opacity: envoi ? 0.6 : 1 }}>
            {envoi ? "Envoi…" : "Envoyer ma demande"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold mb-3">📋 Mes demandes</h2>
        {historique.filter((d) => !seul || d.type === seul).length === 0 ? <p className="text-gray-500">Aucune demande pour le moment.</p> : (
          <div className="flex flex-col divide-y">
            {historique.filter((d) => !seul || d.type === seul).map((d) => {
              const st = STATUTS_DEMANDE[d.statut] || STATUTS_DEMANDE.EN_ATTENTE;
              return (
                <div key={d.id} className="py-3 flex justify-between gap-3 flex-wrap">
                  <div style={{ minWidth: 0 }}>
                    <p className="font-semibold">{TYPES_DEMANDE[d.type]?.icone} {TYPES_DEMANDE[d.type]?.label}{d.app ? ` — ${appFraneo(d.app)?.nom ?? d.app}` : ""}</p>
                    <p className="text-xs text-gray-500">{new Date(d.createdAt).toLocaleDateString("fr-FR")}{d.options.length ? ` · ${d.options.join(", ")}` : ""}{d.remise ? ` · remise ${Math.round(d.remise * 100)} %` : ""}</p>
                    {d.message && <p className="text-sm text-gray-600">{d.message}</p>}
                    {d.reponse && <p className="text-sm mt-1" style={{ background: "#f0fdf4", borderRadius: 8, padding: "6px 10px" }}>💬 FRANEO RH : {d.reponse}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span style={{ background: st.fond, color: st.texte, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{st.label}</span>
                    {d.statut === "EN_ATTENTE" && <button type="button" onClick={async () => { if (confirm("Annuler cette demande ?")) { await fetch(`/api/demandes-services/${d.id}`, { method: "DELETE" }); charger(); } }} className="text-xs text-gray-500 underline">Annuler</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
