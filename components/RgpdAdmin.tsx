"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { estComplete } from "@/lib/legal";

type Ligne = { id: string; createdAt: string; action: string; email: string | null; role: string | null; entreprise: string | null; cible: string | null; details: string | null; ip: string | null };
type Donnees = {
  journal: Ligne[];
  total: number;
  pages: number;
  echecs24h: number;
  blocages24h: number;
  aAnonymiser: { id: string; nom: string; prenom: string; dateFin: string | null; entreprise: { nom: string } }[];
  conservation: Record<string, number>;
};

const ACTIONS: Record<string, { label: string; couleur: string }> = {
  LOGIN: { label: "Connexion", couleur: "#15803d" },
  LOGIN_ECHEC: { label: "Mot de passe erroné", couleur: "#c2410c" },
  LOGIN_BLOQUE: { label: "Connexion bloquée", couleur: "#b91c1c" },
  LOGOUT: { label: "Déconnexion", couleur: "#6b7280" },
  MDP_CHANGE: { label: "Mot de passe modifié", couleur: "#2563eb" },
  MDP_RESET: { label: "Mot de passe réinitialisé", couleur: "#2563eb" },
  MDP_OUBLIE: { label: "Mot de passe oublié", couleur: "#6b7280" },
  EXPORT: { label: "Export Excel", couleur: "#7c3aed" },
  DROITS: { label: "Droits modifiés", couleur: "#7c3aed" },
  SALARIE_SUPPR: { label: "Salarié supprimé", couleur: "#b91c1c" },
  RGPD_EXPORT: { label: "Export RGPD", couleur: "#7c3aed" },
  RGPD_ANONYMISATION: { label: "Anonymisation", couleur: "#b91c1c" },
};

const dateHeure = (d: string) => new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

export default function RgpdAdmin() {
  const [d, setD] = useState<Donnees | null>(null);
  const [page, setPage] = useState(0);
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [recherche, setRecherche] = useState("");
  const [purge, setPurge] = useState<string | null>(null);

  const charger = useCallback(() => {
    const p = new URLSearchParams({ page: String(page), action, q: recherche });
    fetch(`/api/admin/rgpd?${p}`).then((r) => (r.ok ? r.json() : null)).then(setD).catch(() => setD(null));
  }, [page, action, recherche]);
  useEffect(() => { charger(); }, [charger]);

  async function purger() {
    if (!confirm("Supprimer maintenant les données dont la durée de conservation est dépassée ? (Cette purge tourne aussi chaque nuit.)")) return;
    setPurge("Purge en cours…");
    const r = await fetch("/api/admin/rgpd", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "purger" }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setPurge(j.erreur || "Erreur"); return; }
    const x = j.resultat as Record<string, number>;
    setPurge(`✅ Supprimés : ${x.pointages} pointage(s), ${x.audit} ligne(s) de journal, ${x.jetons} lien(s) expiré(s), ${x.buddy + x.contexte} donnée(s) Buddy.`);
    charger();
  }

  const c = d?.conservation;

  return (
    <>
      {!estComplete() && (
        <div className="rounded-xl p-4" style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412" }}>
          ⚠️ Les <Link href="/mentions-legales" className="underline font-semibold">mentions légales</Link> et la{" "}
          <Link href="/confidentialite" className="underline font-semibold">politique de confidentialité</Link> contiennent encore des « À compléter » :
          renseignez SIRET, adresse, contact et région de la base dans le fichier <code>lib/legal.ts</code>.
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <Carte titre="Mots de passe erronés (24 h)" valeur={d?.echecs24h} alerte={(d?.echecs24h ?? 0) > 20} />
        <Carte titre="Connexions bloquées (24 h)" valeur={d?.blocages24h} alerte={(d?.blocages24h ?? 0) > 0} />
        <Carte titre="Salariés sortis à anonymiser" valeur={d?.aAnonymiser.length} alerte={(d?.aAnonymiser.length ?? 0) > 0} />
        <Carte titre="Événements journalisés" valeur={d?.total} />
      </div>

      {d && d.aAnonymiser.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold mb-1">🧹 Salariés sortis depuis plus de {c?.anonymisationApresSortieAns ?? 5} ans</h2>
          <p className="text-sm text-gray-500 mb-3">La durée de conservation est dépassée : ouvrez la fiche et cliquez sur « Anonymiser ce salarié ».</p>
          <ul className="divide-y">
            {d.aAnonymiser.map((s) => (
              <li key={s.id} className="py-2 flex justify-between gap-3 text-sm">
                <Link href={`/admin/salaries/${s.id}`} className="underline font-semibold">{s.prenom} {s.nom}</Link>
                <span className="text-gray-500">{s.entreprise.nom} · sorti le {s.dateFin ? new Date(s.dateFin).toLocaleDateString("fr-FR") : "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-wrap gap-3 items-end justify-between mb-4">
          <h2 className="text-lg font-bold">📜 Journal d&apos;audit</h2>
          <div className="flex flex-wrap gap-2">
            <select value={action} onChange={(e) => { setAction(e.target.value); setPage(0); }} className="border rounded-lg px-3 py-2 text-sm" aria-label="Type d'événement">
              <option value="">Tous les événements</option>
              {Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <form onSubmit={(e) => { e.preventDefault(); setRecherche(q); setPage(0); }} className="flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="E-mail, salarié, IP…" className="border rounded-lg px-3 py-2 text-sm" aria-label="Rechercher" />
              <button type="submit" className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold">Rechercher</button>
            </form>
          </div>
        </div>
        {!d ? (
          <p className="text-gray-500 text-sm">Chargement…</p>
        ) : d.journal.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun événement.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Événement</th><th className="py-2 pr-3">Qui</th><th className="py-2 pr-3">Entreprise</th><th className="py-2 pr-3">Détail</th><th className="py-2">IP</th>
                </tr>
              </thead>
              <tbody>
                {d.journal.map((l) => {
                  const a = ACTIONS[l.action] ?? { label: l.action, couleur: "#374151" };
                  return (
                    <tr key={l.id} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-3 whitespace-nowrap">{dateHeure(l.createdAt)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap font-semibold" style={{ color: a.couleur }}>{a.label}</td>
                      <td className="py-2 pr-3">{l.email || "—"}{l.role ? <span className="text-gray-400"> · {l.role}</span> : null}</td>
                      <td className="py-2 pr-3">{l.entreprise || "—"}</td>
                      <td className="py-2 pr-3">{[l.cible, l.details].filter(Boolean).join(" — ") || "—"}</td>
                      <td className="py-2 text-gray-500 whitespace-nowrap">{l.ip || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {d && d.pages > 1 && (
          <div className="flex items-center gap-3 mt-4 text-sm">
            <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded border disabled:opacity-40">← Précédent</button>
            <span>Page {page + 1} / {d.pages}</span>
            <button type="button" disabled={page + 1 >= d.pages} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded border disabled:opacity-40">Suivant →</button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold mb-2">⏳ Durées de conservation (appliquées chaque nuit)</h2>
        <ul className="text-sm text-gray-700 list-disc pl-6 space-y-1 mb-4">
          <li>Pointages du badge : {c ? c.pointagesJours : 365} jours</li>
          <li>Journal d&apos;audit : {c ? c.journalAuditJours : 365} jours</li>
          <li>Questions Buddy ignorées : {c ? c.questionsBuddyIgnoreesJours : 365} jours · contexte de conversation : {c ? c.contexteBuddyJours : 30} jours</li>
          <li>Liens de réinitialisation : supprimés dès leur expiration</li>
          <li>Salariés sortis : anonymisation à faire depuis leur fiche au plus tard {c ? c.anonymisationApresSortieAns : 5} ans après la sortie (liste ci-dessus)</li>
        </ul>
        <div className="flex flex-wrap gap-3 items-center">
          <button type="button" onClick={purger} className="px-4 py-2 rounded-lg border-2 border-gray-300 text-sm font-semibold">Lancer la purge maintenant</button>
          <Link href="/confidentialite" className="text-sm underline text-gray-600">Politique de confidentialité</Link>
          <Link href="/mentions-legales" className="text-sm underline text-gray-600">Mentions légales</Link>
        </div>
        {purge && <p className="text-sm mt-3">{purge}</p>}
      </div>
    </>
  );
}

function Carte({ titre, valeur, alerte }: { titre: string; valeur?: number; alerte?: boolean }) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <p className="text-sm text-gray-500">{titre}</p>
      <p className="text-3xl font-bold mt-1" style={{ color: alerte ? "#c2410c" : "#111827" }}>{valeur ?? "…"}</p>
    </div>
  );
}
