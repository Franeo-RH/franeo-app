"use client";

import { useCallback, useEffect, useState } from "react";
import { libelleRappel, TYPES_RAPPEL, typeDe } from "@/lib/rappels";

type S = { id: string; prenom: string; nom: string; statut?: string };
type Doc = { id: string; nom: string; type: string; dateAjout: string; mime: string | null; taille: number | null; rappelId: string | null; auteur: string | null };
type Rappel = { id: string; type: string; libelle: string | null; dateEcheance: string; traite: boolean };

const taille = (o: number | null) => (o == null ? "" : o > 1048576 ? `${(o / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);

/** Gestion RH › Documents : un espace de dépôt par salarié, relié à ses échéances */
export default function DocumentsSalaries({ salarieInitial }: { salarieInitial?: string }) {
  const [salaries, setSalaries] = useState<S[]>([]);
  const [salarieId, setSalarieId] = useState(salarieInitial || "");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [rappels, setRappels] = useState<Rappel[]>([]);
  const [fichier, setFichier] = useState<File | null>(null);
  const [type, setType] = useState("AUTRE");
  const [rappelId, setRappelId] = useState("");
  const [traiter, setTraiter] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    fetch("/api/salaries").then((r) => r.json()).then((d) => {
      if (!Array.isArray(d)) return;
      const l = (d as S[]).sort((a, b) => a.nom.localeCompare(b.nom));
      setSalaries(l);
      if (!salarieInitial && l[0]) setSalarieId(l[0].id);
    }).catch(() => {});
  }, [salarieInitial]);

  const charger = useCallback(async () => {
    if (!salarieId) return;
    const [d, r] = await Promise.all([
      fetch(`/api/documents?salarieId=${salarieId}`).then((x) => x.json()).catch(() => []),
      fetch(`/api/salaries/${salarieId}/rappels`).then((x) => x.json()).catch(() => []),
    ]);
    setDocs(Array.isArray(d) ? d : []);
    const lr = Array.isArray(r) ? r : Array.isArray(r?.rappels) ? r.rappels : [];
    setRappels(lr);
  }, [salarieId]);
  useEffect(() => { charger(); setRappelId(""); setMsg(null); }, [charger]);

  async function deposer(e: React.FormEvent) {
    e.preventDefault();
    if (!salarieId) { setMsg({ ok: false, t: "Choisissez d'abord un salarié." }); return; }
    if (!fichier) { setMsg({ ok: false, t: "Choisissez d'abord un fichier (bouton « Choisir un fichier »)." }); return; }
    if (fichier.size > 4 * 1024 * 1024) { setMsg({ ok: false, t: "Fichier trop lourd : 4 Mo maximum." }); return; }
    setEnvoi(true); setMsg(null);
    const fd = new FormData();
    fd.append("salarieId", salarieId); fd.append("fichier", fichier); fd.append("type", rappelId ? (rappels.find((r) => r.id === rappelId)?.type || type) : type);
    if (rappelId) { fd.append("rappelId", rappelId); if (traiter) fd.append("traiter", "1"); }
    let res: Response;
    try {
      res = await fetch("/api/documents", { method: "POST", body: fd });
    } catch {
      setEnvoi(false); setMsg({ ok: false, t: "Connexion impossible : vérifiez votre réseau et réessayez." }); return;
    }
    const d = await res.json().catch(() => ({}));
    setEnvoi(false);
    setMsg(res.ok ? { ok: true, t: "✅ Document déposé" } : { ok: false, t: d.erreur || (res.status === 413 ? "Fichier trop lourd : 4 Mo maximum." : res.status === 403 ? "Votre compte n'a pas accès aux documents : contactez FRANEO RH." : `Erreur ${res.status} : réessayez ou contactez FRANEO RH.`) });
    if (res.ok) { setFichier(null); (e.target as HTMLFormElement).reset(); charger(); }
  }
  async function supprimer(id: string) {
    if (!confirm("Supprimer ce document ?")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    charger();
  }

  const rappelDe = (id: string | null) => rappels.find((r) => r.id === id);
  const aTraiter = rappels.filter((r) => !r.traite);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-3xl font-bold">📁 Documents des salariés</h1>
        <p className="text-gray-500 mt-1">Déposez les documents de chaque salarié (visite médicale, titre de séjour, avenant, diplôme…) et reliez-les à l&apos;échéance correspondante. PDF, image, Word ou Excel, 4 Mo maximum.</p>
        <select value={salarieId} onChange={(e) => setSalarieId(e.target.value)} className="border rounded-lg px-3 py-2 mt-4 w-full md:w-96" aria-label="Salarié">
          {salaries.map((s) => <option key={s.id} value={s.id}>{s.nom} {s.prenom}</option>)}
        </select>
      </div>

      {salarieId && (
        <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          <form onSubmit={deposer} className="bg-white rounded-xl shadow p-6 flex flex-col gap-3">
            <h2 className="text-lg font-bold">➕ Déposer un document</h2>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,.xls,.xlsx,.txt,.csv" onChange={(e) => setFichier(e.target.files?.[0] || null)} aria-label="Fichier" />
            <label className="text-sm font-semibold">Lier à une échéance
              <select value={rappelId} onChange={(e) => setRappelId(e.target.value)} className="border rounded-lg px-3 py-2 w-full mt-1 font-normal">
                <option value="">— Aucune —</option>
                {aTraiter.map((r) => <option key={r.id} value={r.id}>{typeDe(r.type).icone} {libelleRappel(r)} — {new Date(r.dateEcheance).toLocaleDateString("fr-FR")}</option>)}
              </select>
            </label>
            {rappelId ? (
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={traiter} onChange={(e) => setTraiter(e.target.checked)} /> Marquer cette échéance comme traitée</label>
            ) : (
              <label className="text-sm font-semibold">Type de document
                <select value={type} onChange={(e) => setType(e.target.value)} className="border rounded-lg px-3 py-2 w-full mt-1 font-normal">
                  <option value="AUTRE">Autre document</option>
                  <option value="CONTRAT">Contrat de travail</option>
                  {TYPES_RAPPEL.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
                </select>
              </label>
            )}
            <button type="submit" disabled={envoi} className="bg-orange-500 text-white rounded-lg px-4 py-2 font-semibold" style={{ opacity: envoi ? 0.6 : 1, cursor: "pointer" }}>{envoi ? "Envoi…" : "Déposer"}</button>
            {msg && <p className="text-sm font-semibold" style={{ color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.t}</p>}
            <p className="text-xs text-gray-400">Documents confidentiels : visibles uniquement par vous et FRANEO RH, jamais par le salarié. Ne déposez pas d&apos;arrêt de travail ni de document médical détaillé.</p>
          </form>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-bold mb-3">📄 Documents ({docs.length})</h2>
            {docs.length === 0 ? <p className="text-gray-500 text-sm">Aucun document pour ce salarié.</p> : (
              <ul className="flex flex-col divide-y">
                {docs.map((d) => {
                  const r = rappelDe(d.rappelId);
                  return (
                    <li key={d.id} className="py-3 flex justify-between gap-3 items-center flex-wrap">
                      <div style={{ minWidth: 0 }}>
                        <a href={`/api/documents/${d.id}?voir=1`} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-orange-500" style={{ overflowWrap: "anywhere" }}>{d.nom}</a>
                        <p className="text-xs text-gray-500">{typeDe(d.type).label === d.type ? (d.type === "AUTRE" ? "Autre" : d.type === "CONTRAT" ? "Contrat" : d.type) : typeDe(d.type).label} · {new Date(d.dateAjout).toLocaleDateString("fr-FR")} · {taille(d.taille)}{d.auteur ? ` · ${d.auteur}` : ""}</p>
                        {r && <p className="text-xs text-orange-600">🔗 {libelleRappel(r)} ({new Date(r.dateEcheance).toLocaleDateString("fr-FR")}){r.traite ? " · traitée" : ""}</p>}
                      </div>
                      <div className="flex gap-3">
                        <a href={`/api/documents/${d.id}`} className="text-sm font-semibold text-gray-700">⬇️</a>
                        <button type="button" onClick={() => supprimer(d.id)} className="text-sm text-red-600" aria-label="Supprimer">🗑️</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {aTraiter.length > 0 && (
              <div className="mt-4 border-t pt-3">
                <p className="text-sm font-bold mb-1">⏰ Échéances en cours</p>
                {aTraiter.map((r) => (
                  <p key={r.id} className="text-sm">{typeDe(r.type).icone} {libelleRappel(r)} — {new Date(r.dateEcheance).toLocaleDateString("fr-FR")} {docs.some((d) => d.rappelId === r.id) ? "✅ document déposé" : <span className="text-gray-400">· aucun document</span>}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
