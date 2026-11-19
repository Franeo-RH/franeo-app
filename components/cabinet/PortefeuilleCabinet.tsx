"use client";

import { useMemo, useState } from "react";
import type { LigneClient } from "@/lib/cabinet";

const TEINTES = ["#f97316", "#ef4444", "#8b5cf6", "#0ea5e9", "#10b981", "#eab308", "#ec4899", "#14b8a6"];
const teinte = (nom: string) => TEINTES[[...nom].reduce((t, c) => t + c.charCodeAt(0), 0) % TEINTES.length];
const initiales = (nom: string) => nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join("").toUpperCase();
const CLOTURE: Record<string, string> = { CLOTURE: "🔒 Mois clôturé", DEMANDE_CLOTURE: "⏳ Clôture demandée", DEMANDE_DECLOTURE: "⏳ Réouverture demandée" };

/** Portefeuille du cabinet : un tableau de bord par client, ouverture du dossier en un clic */
export default function PortefeuilleCabinet({ clients }: { clients: LigneClient[] }) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<"tous" | "traiter">("tous");
  const [ouverture, setOuverture] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");

  const aTraiter = (c: LigneClient) => c.absences + c.variables + c.demandes + c.echeances > 0;
  const visibles = useMemo(() => {
    const r = recherche.trim().toLowerCase();
    return clients.filter((c) => (!r || c.nom.toLowerCase().includes(r) || (c.ville ?? "").toLowerCase().includes(r)) && (filtre === "tous" || aTraiter(c)));
  }, [clients, recherche, filtre]);

  async function ouvrir(id: string, vers = "/client/dashboard") {
    setOuverture(id + vers);
    setErreur("");
    const res = await fetch("/api/cabinet/client", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entrepriseId: id, vers }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setErreur(data.erreur || "Ce dossier ne peut pas être ouvert."); setOuverture(null); return; }
    window.location.href = data.vers;
  }

  const nbATraiter = clients.filter(aTraiter).length;

  return (
    <section className="flex flex-col gap-4">
      <div className="fr-verre fr-cab-outils">
        <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="🔎 Rechercher un client ou une ville" className="fr-cab-recherche" aria-label="Rechercher un client" />
        <div className="fr-cab-filtres" role="tablist">
          <button type="button" role="tab" aria-selected={filtre === "tous"} className={`fr-puce${filtre === "tous" ? " fr-actif" : ""}`} onClick={() => setFiltre("tous")}>Tous ({clients.length})</button>
          <button type="button" role="tab" aria-selected={filtre === "traiter"} className={`fr-puce${filtre === "traiter" ? " fr-actif" : ""}`} onClick={() => setFiltre("traiter")}>À traiter ({nbATraiter})</button>
        </div>
      </div>
      {erreur && <p className="text-sm" style={{ color: "#b91c1c" }}>❌ {erreur}</p>}

      {visibles.length === 0 ? (
        <div className="fr-verre p-8 text-center text-gray-500">{clients.length === 0 ? "Aucun client n'est encore rattaché à votre cabinet. FRANEO RH les ajoute à votre demande." : "Aucun client ne correspond."}</div>
      ) : (
        <div className="fr-cab-grille">
          {visibles.map((c) => {
            const couleur = teinte(c.nom);
            const stats = [
              { n: c.salaries, l: "salariés", alerte: false },
              { n: c.absences, l: "absences à valider", alerte: c.absences > 0 },
              { n: c.variables, l: "variables en attente", alerte: c.variables > 0 },
              { n: c.demandes, l: "demandes à valider", alerte: c.demandes > 0 },
              { n: c.echeances, l: "échéances (30 j)", alerte: c.echeances > 0 },
              { n: c.tickets, l: "tickets ouverts", alerte: false },
            ];
            return (
              <article key={c.id} className={`fr-verre fr-cab-carte${c.actif ? "" : " fr-cab-suspendu"}`} style={{ "--teinte": couleur } as React.CSSProperties}>
                <div className="fr-cab-carte-tete">
                  <span className="fr-cab-avatar" aria-hidden="true">{initiales(c.nom)}</span>
                  <div className="min-w-0">
                    <h2 className="fr-cab-carte-nom">{c.nom}</h2>
                    <p className="fr-cab-carte-sous">{[c.ville, c.formule].filter(Boolean).join(" · ")}</p>
                  </div>
                  {aTraiter(c) ? <span className="fr-cab-pastille">À traiter</span> : <span className="fr-cab-pastille fr-ok">À jour</span>}
                </div>
                <div className="fr-cab-stats">
                  {stats.map((s) => (
                    <div key={s.l} className={`fr-cab-stat${s.alerte ? " fr-alerte" : ""}`}>
                      <strong>{s.n}</strong>
                      <span>{s.l}</span>
                    </div>
                  ))}
                </div>
                <p className="fr-cab-cloture">{c.cloture ? CLOTURE[c.cloture] ?? c.cloture : "📅 Mois en cours"}</p>
                {c.actif ? (
                  <div className="fr-cab-actions">
                    <button type="button" className="fr-cab-ouvrir" disabled={ouverture !== null} onClick={() => ouvrir(c.id)}>
                      {ouverture === c.id + "/client/dashboard" ? "Ouverture…" : "Ouvrir le dossier →"}
                    </button>
                    <button type="button" className="fr-cab-raccourci" disabled={ouverture !== null} onClick={() => ouvrir(c.id, "/client/paie")}>💰 Paie</button>
                    <button type="button" className="fr-cab-raccourci" disabled={ouverture !== null} onClick={() => ouvrir(c.id, "/client/salaries/documents")}>📎 Documents</button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">⏸️ Accès suspendu par FRANEO RH</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
