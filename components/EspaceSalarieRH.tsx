"use client";

import { useCallback, useEffect, useState } from "react";
import { LIBELLES_ABSENCE } from "@/lib/espace-salarie";
import { fmtH, NOMS_MOIS } from "@/lib/heures";
import RelevesEquipe from "@/components/RelevesEquipe";
import BadgeSalarie from "@/components/BadgeSalarie";
import HistoriqueBadge from "@/components/HistoriqueBadge";
import MesProjetsSalarie from "@/components/MesProjetsSalarie";
import EtiquettesTableaux from "@/components/EtiquettesTableaux";
import TableauPresences from "@/components/TableauPresences";
import BoutonTheme from "@/components/BoutonTheme";
import Image from "next/image";

const carte: React.CSSProperties = { background: "#ffffff", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", padding: "18px" };
const champ: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #d1d5db", borderRadius: "10px", padding: "11px", fontSize: "16px", background: "#ffffff", marginTop: "4px" };
const label: React.CSSProperties = { display: "block", fontSize: "14px", fontWeight: 600, color: "#374151" };
const bouton = (fond: string, texte = "#ffffff"): React.CSSProperties => ({ background: fond, color: texte, border: fond === "#ffffff" ? "1px solid #d1d5db" : "none", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", fontWeight: 700, cursor: "pointer" });
const fr = (d: string) => new Date(d).toLocaleDateString("fr-FR");
const STATUTS: Record<string, { fond: string; texte: string }> = {
  "En attente": { fond: "#fff7ed", texte: "#c2410c" }, "Validé": { fond: "#dcfce7", texte: "#15803d" }, "Refusé": { fond: "#fee2e2", texte: "#b91c1c" },
  OUVERTE: { fond: "#fff7ed", texte: "#c2410c" }, REPONDUE: { fond: "#dcfce7", texte: "#15803d" }, CLOSE: { fond: "#f3f4f6", texte: "#374151" },
};
const Pastille = ({ s, libelle }: { s: string; libelle?: string }) => {
  const st = STATUTS[s] || STATUTS.CLOSE;
  return <span style={{ background: st.fond, color: st.texte, borderRadius: "999px", padding: "3px 10px", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap" }}>{libelle || s}</span>;
};

type Personne = { id: string; prenom: string; nom: string; poste: string };
type Equipe = {
  role: "SALARIE" | "MANAGER" | "DIRIGEANT";
  n1: Personne | null; direction: Personne[]; voitSalaires: boolean; peutSaisirVariables: boolean;
  equipe: (Personne & { service: string | null; roleRH: string; salaireMensuel: number | null })[];
  releves: { id: string; mois: number; annee: number; commentaire: string | null; salarie: { prenom: string; nom: string }; jours: { heures: number | null; heuresSupp: number }[] }[];
  absences: { id: string; type: string; dateDebut: string; dateFin: string; commentaire: string | null; salarie: { prenom: string; nom: string } }[];
  frais: { id: string; date: string; montant: number; motif: string; salarie: { prenom: string; nom: string } }[];
};
type Question = { id: string; sujet: string; statut: string; versFraneo: boolean; moiAuteur: boolean; auteurNom: string; destinataireNom: string; updatedAt: string; messages: { id: string; auteur: string; contenu: string; createdAt: string }[] };
type Frais = { id: string; date: string; montant: number; motif: string; statut: string; motifRefus: string | null };

/** Espace salarié : organisation, notes de frais, questions au N+1 et, pour les managers et dirigeants, la validation de l'équipe */
export default function EspaceSalarieRH({ avecPaie, accueil, absences, releve, prenom, avecBadge = false, avecProjets = false, avecFrais = true, avecQuestions = true }: { avecPaie: boolean; accueil: React.ReactNode; absences?: React.ReactNode; releve?: React.ReactNode; prenom: string; avecBadge?: boolean; avecProjets?: boolean; avecFrais?: boolean; avecQuestions?: boolean }) {
  const [onglet, setOnglet] = useState("accueil");
  const [menu, setMenu] = useState(false);
  useEffect(() => { try { const o = sessionStorage.getItem("fr-onglet-salarie"); if (o) setOnglet(o); } catch {} }, []);
  const [eq, setEq] = useState<Equipe | null>(null);
  const [frais, setFrais] = useState<Frais[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [nf, setNf] = useState({ date: "", montant: "", motif: "" });
  const [nq, setNq] = useState({ sujet: "", contenu: "" });
  const [reponse, setReponse] = useState<Record<string, string>>({});
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texte: string; ou: string } | null>(null);
  const [nv, setNv] = useState({ salarieId: "", type: "PRIME", valeur: "", commentaire: "" });

  const charger = useCallback(async () => {
    const [e, f, q] = await Promise.all([
      fetch("/api/espace-salarie/equipe").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/espace-salarie/frais").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/espace-salarie/questions").then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]);
    setEq(e); setFrais(Array.isArray(f) ? f : []); setQuestions(Array.isArray(q) ? q : []);
  }, []);
  useEffect(() => { charger(); }, [charger]);

  async function appel(url: string, methode: string, corps: unknown, ou: string, ok: string) {
    const res = await fetch(url, { method: methode, headers: { "Content-Type": "application/json" }, body: corps ? JSON.stringify(corps) : undefined });
    const d = await res.json().catch(() => ({}));
    setMsg({ ok: res.ok, texte: res.ok ? ok : d.erreur || "Erreur", ou });
    if (res.ok) charger();
    return res.ok;
  }

  async function decider(type: "releve" | "absence" | "frais", id: string, statut: "Validé" | "Refusé") {
    let motif: string | null = null;
    if (statut === "Refusé") { motif = prompt("Motif du refus :"); if (motif === null) return; }
    await appel("/api/espace-salarie/valider", "PUT", { type, id, statut, motif }, "equipe", statut === "Validé" ? "✅ Validé" : "↩️ Refusé");
  }

  const Retour = ({ ou }: { ou: string }) => (msg && msg.ou === ou ? <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.texte}</p> : null);
  const recues = questions.filter((q) => !q.moiAuteur);
  const posees = questions.filter((q) => q.moiAuteur);
  const valideur = eq && eq.role !== "SALARIE";
  const maintenant = new Date();

  const fil = (q: Question) => (
    <li key={q.id} style={{ borderTop: "1px solid #f3f4f6", padding: "10px 0" }}>
      <button type="button" onClick={() => setOuverte(ouverte === q.id ? null : q.id)} style={{ background: "none", border: "none", padding: 0, width: "100%", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center", color: "inherit" }}>
        <span style={{ minWidth: 0 }}>
          <strong style={{ fontSize: "15px" }}>{q.sujet}</strong>
          <span style={{ display: "block", fontSize: "12px", color: "#6b7280" }}>{q.moiAuteur ? `À : ${q.destinataireNom}` : `De : ${q.auteurNom}`} · {fr(q.updatedAt)}</span>
        </span>
        <Pastille s={q.statut} libelle={q.versFraneo ? "Chez FRANEO RH" : q.statut === "OUVERTE" ? "En attente" : q.statut === "REPONDUE" ? "Répondu" : "Close"} />
      </button>
      {ouverte === q.id && (
        <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {q.messages.map((m) => (
            <div key={m.id} style={{ background: "#f9fafb", borderRadius: "10px", padding: "8px 10px", fontSize: "14px" }}>
              <strong style={{ fontSize: "12px", color: "#6b7280" }}>{m.auteur} · {new Date(m.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</strong>
              <p style={{ margin: "2px 0 0", whiteSpace: "pre-wrap" }}>{m.contenu}</p>
            </div>
          ))}
          {q.statut !== "CLOSE" && !q.versFraneo && (
            <>
              <textarea rows={2} value={reponse[q.id] || ""} onChange={(e) => setReponse({ ...reponse, [q.id]: e.target.value })} placeholder="Votre message…" style={{ ...champ, resize: "none" }} />
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <button type="button" style={bouton("#f97316")} onClick={async () => { if (await appel(`/api/espace-salarie/questions/${q.id}`, "POST", { contenu: reponse[q.id] }, "q", "✅ Message envoyé")) setReponse({ ...reponse, [q.id]: "" }); }}>Envoyer</button>
                {!q.moiAuteur && <button type="button" style={bouton("#ffffff", "#111827")} onClick={() => appel(`/api/espace-salarie/questions/${q.id}`, "POST", { rerouter: "N+1" }, "q", "↪️ Transférée à votre N+1")}>↪️ À mon N+1</button>}
                {!q.moiAuteur && <button type="button" style={bouton("#ffffff", "#111827")} onClick={() => appel(`/api/espace-salarie/questions/${q.id}`, "POST", { rerouter: "FRANEO" }, "q", "↪️ Transférée à FRANEO RH")}>↪️ À FRANEO RH</button>}
                <button type="button" style={bouton("#ffffff", "#6b7280")} onClick={() => appel(`/api/espace-salarie/questions/${q.id}`, "POST", { statut: "CLOSE" }, "q", "Question close")}>Clore</button>
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );

  const blocOrga = (
    <>

      {eq && (
        <section style={carte} aria-labelledby="t-orga">
          <h2 id="t-orga" style={{ margin: "0 0 10px", fontSize: "18px" }}>🏢 Mon organisation</h2>
          <p style={{ margin: "0 0 6px", fontSize: "14px" }}><strong>Mon responsable (N+1) :</strong> {eq.n1 ? `${eq.n1.prenom} ${eq.n1.nom} — ${eq.n1.poste}` : "la direction"}</p>
          {eq.direction.length > 0 && (
            <p style={{ margin: 0, fontSize: "14px" }}><strong>Direction :</strong> {eq.direction.map((d) => `${d.prenom} ${d.nom}`).join(", ")}</p>
          )}
          {valideur && (
            <details style={{ marginTop: "10px" }}>
              <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: "14px" }}>👥 Mon équipe ({eq.equipe.length})</summary>
              <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
                {eq.equipe.map((m) => (
                  <li key={m.id} style={{ borderTop: "1px solid #f3f4f6", padding: "8px 0", fontSize: "14px", display: "flex", justifyContent: "space-between", gap: "8px" }}>
                    <span>{m.prenom} {m.nom} <span style={{ color: "#6b7280" }}>· {m.poste}{m.service ? ` · ${m.service}` : ""}</span></span>
                    {eq.voitSalaires && m.salaireMensuel != null && <strong>{m.salaireMensuel.toLocaleString("fr-FR")} €</strong>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
    </>
  );
  const blocValidation = (
    <>

      {eq && valideur && (
        <section style={{ ...carte, border: "2px solid #fed7aa" }} aria-labelledby="t-valid">
          <h2 id="t-valid" style={{ margin: "0 0 4px", fontSize: "18px" }}>✅ À valider ({eq.releves.length + eq.absences.length + eq.frais.length})</h2>
          <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#6b7280" }}>{eq.role === "DIRIGEANT" ? "Toute l'entreprise" : "Les salariés dont vous êtes le manager"}</p>
          <Retour ou="equipe" />
          {eq.releves.map((r) => {
            const h = r.jours.reduce((a, j) => a + (j.heures || 0), 0), hs = r.jours.reduce((a, j) => a + j.heuresSupp, 0);
            return (
              <div key={r.id} style={{ borderTop: "1px solid #f3f4f6", padding: "10px 0" }}>
                <p style={{ margin: 0, fontWeight: 700 }}>⏱️ Relevé — {r.salarie.prenom} {r.salarie.nom} · {NOMS_MOIS[r.mois - 1]} {r.annee}</p>
                <p style={{ margin: "2px 0 6px", fontSize: "14px" }}>{fmtH(h)}{hs > 0 ? ` · dont ${fmtH(hs)} supp.` : ""}{r.commentaire ? ` · 💬 ${r.commentaire}` : ""}</p>
                <div style={{ display: "flex", gap: "6px" }}><button type="button" style={bouton("#16a34a")} onClick={() => decider("releve", r.id, "Validé")}>Valider</button><button type="button" style={bouton("#dc2626")} onClick={() => decider("releve", r.id, "Refusé")}>Refuser</button></div>
              </div>
            );
          })}
          {eq.absences.map((a) => (
            <div key={a.id} style={{ borderTop: "1px solid #f3f4f6", padding: "10px 0" }}>
              <p style={{ margin: 0, fontWeight: 700 }}>🏖️ {LIBELLES_ABSENCE[a.type] || a.type} — {a.salarie.prenom} {a.salarie.nom}</p>
              <p style={{ margin: "2px 0 6px", fontSize: "14px" }}>{fr(a.dateDebut)} → {fr(a.dateFin)}{a.commentaire ? ` · ${a.commentaire}` : ""}</p>
              <div style={{ display: "flex", gap: "6px" }}><button type="button" style={bouton("#16a34a")} onClick={() => decider("absence", a.id, "Validé")}>Valider</button><button type="button" style={bouton("#dc2626")} onClick={() => decider("absence", a.id, "Refusé")}>Refuser</button></div>
            </div>
          ))}
          {eq.frais.map((f) => (
            <div key={f.id} style={{ borderTop: "1px solid #f3f4f6", padding: "10px 0" }}>
              <p style={{ margin: 0, fontWeight: 700 }}>🧾 Frais — {f.salarie.prenom} {f.salarie.nom} · {f.montant.toLocaleString("fr-FR")} €</p>
              <p style={{ margin: "2px 0 6px", fontSize: "14px" }}>{fr(f.date)} · {f.motif}</p>
              <div style={{ display: "flex", gap: "6px" }}><button type="button" style={bouton("#16a34a")} onClick={() => decider("frais", f.id, "Validé")}>Valider</button><button type="button" style={bouton("#dc2626")} onClick={() => decider("frais", f.id, "Refusé")}>Refuser</button></div>
            </div>
          ))}
          {eq.releves.length + eq.absences.length + eq.frais.length === 0 && <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>Rien à valider pour le moment. 👍</p>}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "12px" }}>
            {[["absences", "Absences"], ["releves", "Relevés"], ["frais", "Frais"], ["equipe", "Équipe"]].map(([t, l]) => (
              <a key={t} href={`/api/espace-salarie/export?type=${t}`} style={{ ...bouton("#ffffff", "#111827"), textDecoration: "none" }}>📥 {l}</a>
            ))}
          </div>
        </section>
      )}
    </>
  );
  const blocVariables = (
    <>

      {eq && valideur && eq.peutSaisirVariables && avecPaie && (
        <section style={carte} aria-labelledby="t-var">
          <h2 id="t-var" style={{ margin: "0 0 10px", fontSize: "18px" }}>✏️ Saisir une variable de paie</h2>
          <form onSubmit={async (e) => { e.preventDefault(); if (await appel("/api/espace-salarie/variables", "POST", { ...nv, mois: maintenant.getMonth() + 1, annee: maintenant.getFullYear() }, "var", "✅ Variable enregistrée")) setNv({ ...nv, valeur: "", commentaire: "" }); }} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={label}>Salarié<select required value={nv.salarieId} onChange={(e) => setNv({ ...nv, salarieId: e.target.value })} style={champ}><option value="">—</option>{eq.equipe.map((m) => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}</select></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <label style={label}>Type<select value={nv.type} onChange={(e) => setNv({ ...nv, type: e.target.value })} style={champ}><option value="PRIME">Prime (€)</option><option value="HEURE_SUPPLEMENTAIRE">Heures supp. (h)</option><option value="ACOMPTE">Acompte (€)</option><option value="NOTE_FRAIS">Frais (€)</option></select></label>
              <label style={label}>Valeur<input required inputMode="decimal" value={nv.valeur} onChange={(e) => setNv({ ...nv, valeur: e.target.value })} style={champ} /></label>
            </div>
            <label style={label}>Commentaire<input value={nv.commentaire} onChange={(e) => setNv({ ...nv, commentaire: e.target.value })} style={champ} /></label>
            <button type="submit" style={bouton("#f97316")}>Enregistrer ({NOMS_MOIS[maintenant.getMonth()]})</button>
            <Retour ou="var" />
          </form>
        </section>
      )}
    </>
  );
  const blocFrais = (
    <>

      <section style={carte} aria-labelledby="t-frais">
        <h2 id="t-frais" style={{ margin: "0 0 10px", fontSize: "18px" }}>🧾 Mes notes de frais</h2>
        <form onSubmit={async (e) => { e.preventDefault(); if (await appel("/api/espace-salarie/frais", "POST", nf, "frais", "✅ Note de frais envoyée")) setNf({ date: "", montant: "", motif: "" }); }} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <label style={label}>Date<input type="date" required value={nf.date} onChange={(e) => setNf({ ...nf, date: e.target.value })} style={champ} /></label>
            <label style={label}>Montant (€)<input required inputMode="decimal" value={nf.montant} onChange={(e) => setNf({ ...nf, montant: e.target.value })} style={champ} /></label>
          </div>
          <label style={label}>Motif<input required maxLength={200} value={nf.motif} onChange={(e) => setNf({ ...nf, motif: e.target.value })} placeholder="Ex : repas client, péage, parking…" style={champ} /></label>
          <button type="submit" style={bouton("#f97316")}>Envoyer la note de frais</button>
          <Retour ou="frais" />
          <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Gardez votre justificatif : il pourra vous être demandé par votre employeur.</p>
        </form>
        {frais.length > 0 && (
          <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0 }}>
            {frais.map((f) => (
              <li key={f.id} style={{ borderTop: "1px solid #f3f4f6", padding: "8px 0", display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center", fontSize: "14px" }}>
                <span>{fr(f.date)} · <strong>{f.montant.toLocaleString("fr-FR")} €</strong> · {f.motif}{f.motifRefus ? <span style={{ display: "block", color: "#b91c1c", fontSize: "12px" }}>Motif : {f.motifRefus}</span> : null}</span>
                <span style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <Pastille s={f.statut} />
                  {f.statut === "En attente" && <button type="button" onClick={() => appel(`/api/espace-salarie/frais?id=${f.id}`, "DELETE", null, "frais", "Note retirée")} style={{ background: "none", border: "none", cursor: "pointer" }} aria-label="Retirer">🗑️</button>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
  const blocQuestions = (
    <>

      <section style={carte} aria-labelledby="t-q">
        <h2 id="t-q" style={{ margin: "0 0 10px", fontSize: "18px" }}>💬 Poser une question à {eq?.n1 ? `${eq.n1.prenom} (mon N+1)` : "la direction"}</h2>
        <form onSubmit={async (e) => { e.preventDefault(); if (await appel("/api/espace-salarie/questions", "POST", nq, "q", "✅ Question envoyée")) setNq({ sujet: "", contenu: "" }); }} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <input maxLength={120} value={nq.sujet} onChange={(e) => setNq({ ...nq, sujet: e.target.value })} placeholder="Sujet" aria-label="Sujet" style={champ} />
          <textarea required rows={3} value={nq.contenu} onChange={(e) => setNq({ ...nq, contenu: e.target.value })} placeholder="Votre question…" aria-label="Question" style={{ ...champ, resize: "none" }} />
          <button type="submit" style={bouton("#f97316")}>Envoyer</button>
          <Retour ou="q" />
        </form>
        {recues.length > 0 && (<><h3 style={{ margin: "14px 0 0", fontSize: "15px" }}>📥 Questions reçues de mon équipe</h3><ul style={{ listStyle: "none", margin: 0, padding: 0 }}>{recues.map(fil)}</ul></>)}
        {posees.length > 0 && (<><h3 style={{ margin: "14px 0 0", fontSize: "15px" }}>📤 Mes questions</h3><ul style={{ listStyle: "none", margin: 0, padding: 0 }}>{posees.map(fil)}</ul></>)}
      </section>
    </>
  );

  const nbAValider = eq ? eq.releves.length + eq.absences.length + eq.frais.length : 0;
  const questionsEnAttente = recues.filter((q) => q.statut === "OUVERTE" && !q.versFraneo).length;

  // Même logique que le reste du site : des onglets en haut (avec leurs logos), des rubriques dans la barre latérale
  type Rubrique = { id: string; label: string; icone: string; badge?: number; contenu: React.ReactNode };
  type Module = { id: string; label: string; logo: string; badge?: number; rubriques: Rubrique[] };
  const modules: Module[] = [
    { id: "accueil", label: "Dashboard", logo: "/DASHBOARD-LOGO.png", rubriques: [{ id: "accueil", label: "Tableau de bord", icone: "📊", contenu: <>{avecBadge && <BadgeSalarie compact />}{accueil}{avecBadge && <HistoriqueBadge />}{blocOrga}</> }] },
    ...(avecBadge ? [{ id: "badge", label: "Badge", logo: "/TICKET-LOGO.png", rubriques: [{ id: "badge", label: "Pointer", icone: "📍", contenu: <BadgeSalarie /> }, { id: "badge-historique", label: "Mon historique", icone: "🕓", contenu: <HistoriqueBadge /> }, ...(avecProjets ? [{ id: "badge-projets", label: "Mes projets", icone: "📐", contenu: <MesProjetsSalarie /> }] : [])] }] : []),
    ...(valideur ? [{
      id: "equipe", label: "Mon équipe", logo: "/SALARIE-LOGO.png", badge: nbAValider, rubriques: [
        { id: "valider", label: "À valider", icone: "✅", badge: nbAValider, contenu: blocValidation },
        { id: "rma", label: "Relevés de l'équipe", icone: "⏱️", contenu: <RelevesEquipe /> },
        ...(avecBadge ? [{ id: "presences", label: "Présences du jour", icone: "📍", contenu: <TableauPresences api="/api/espace-salarie/presences" /> }] : []),
        ...(eq?.peutSaisirVariables && avecPaie ? [{ id: "variables", label: "Saisir une variable", icone: "✏️", contenu: blocVariables }] : []),
      ],
    }] : []),
    ...(absences || releve ? [{
      id: "temps", label: "Mon temps", logo: "/PAIE-LOGO.png", rubriques: [
        ...(absences ? [{ id: "absences", label: "Absences", icone: "🏖️", contenu: absences }] : []),
        ...(releve ? [{ id: "releve", label: "Relevé mensuel", icone: "⏱️", contenu: releve }] : []),
      ],
    }] : []),
    ...(avecFrais ? [{ id: "frais", label: "Notes de frais", logo: "/ENTREPRISE-LOGO.png", rubriques: [{ id: "frais", label: "Mes notes de frais", icone: "🧾", contenu: blocFrais }] }] : []),
    ...(avecQuestions ? [{ id: "questions", label: "Questions", logo: "/HELPDESK-LOGO.png", badge: questionsEnAttente, rubriques: [{ id: "questions", label: "Mes questions", icone: "💬", badge: questionsEnAttente, contenu: blocQuestions }] }] : []),
  ];
  const moduleCourant = modules.find((m) => m.rubriques.some((r) => r.id === onglet)) ?? modules[0];
  const courant = moduleCourant.rubriques.find((r) => r.id === onglet) ?? moduleCourant.rubriques[0];
  function choisir(id: string) {
    setOnglet(id);
    setMenu(false);
    try { sessionStorage.setItem("fr-onglet-salarie", id); } catch {}
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function deconnexion() {
    try { const cles = await caches.keys(); await Promise.all(cles.filter((k) => k.startsWith("franeo-pages")).map((k) => caches.delete(k))); } catch {}
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }
  const role = eq ? (eq.role === "DIRIGEANT" ? "Dirigeant" : eq.role === "MANAGER" ? "Manager" : "Salarié") : "Espace salarié";
  const profil = (
    <>
      <span className="fr-nav-petit">{role}</span>
      <BoutonTheme className="fr-nav-theme" />
      <button type="button" onClick={deconnexion} className="fr-nav-deco">Déconnexion</button>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <EtiquettesTableaux />
      <nav className="fr-nav fr-es-bureau">
        <div className="fr-nav-barre">
          <button type="button" onClick={() => choisir("accueil")} className="fr-nav-logo" aria-label="Accueil" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <Image src="/FRANEO-Logo-Orange.png" alt="Franeo RH" width={41} height={50} style={{ objectFit: "contain" }} priority />
          </button>
          <div className="fr-nav-liens">
            {modules.map((m) => (
              <button key={m.id} type="button" onClick={() => choisir(m.rubriques[0].id)} className={`fr-nav-lien${m.id === moduleCourant.id ? " fr-actif" : ""}`} style={{ border: "none", cursor: "pointer", position: "relative" }}>
                <Image src={m.logo} alt="" width={18} height={18} className="invert" style={{ objectFit: "contain" }} />
                <span>{m.label}</span>
                {!!m.badge && <span className="fr-side-badge" style={{ position: "absolute", top: 2, right: 4 }}>{m.badge}</span>}
              </button>
            ))}
          </div>
          <div className="fr-nav-profil">
            <span className="fr-nav-prenom">{prenom}</span>
            {profil}
          </div>
          <button type="button" className="fr-burger" aria-label={menu ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={menu} onClick={() => setMenu((o) => !o)}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {menu ? (<><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></>) : (<><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></>)}
            </svg>
          </button>
        </div>
        {menu && (
          <div className="fr-menu-mobile">
            <div className="fr-menu-grille">
              {modules.map((m) => (
                <button key={m.id} type="button" onClick={() => choisir(m.rubriques[0].id)} className={`fr-menu-lien${m.id === moduleCourant.id ? " fr-actif" : ""}`} style={{ border: "none", cursor: "pointer" }}>
                  <Image src={m.logo} alt="" width={22} height={22} className="invert" style={{ objectFit: "contain" }} />
                  <span>{m.label}{m.badge ? ` (${m.badge})` : ""}</span>
                </button>
              ))}
            </div>
            <div className="fr-menu-pied">
              <span>👤 {prenom}</span>
              <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>{profil}</div>
            </div>
          </div>
        )}
      </nav>

      {/* Téléphone : pas de barre noire, une barre avec le logo et toutes les rubriques dans un menu déroulant */}
      <div className={`fr-deroulant fr-es-mobile${menu ? " ouvert" : ""}`}>
        <button type="button" onClick={() => choisir("accueil")} aria-label="Accueil" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}>
          <Image src="/FRANEO-Logo-Orange.png" alt="Franeo RH" width={30} height={37} style={{ objectFit: "contain" }} />
        </button>
        <button type="button" className="fr-deroulant-bouton" aria-expanded={menu} aria-haspopup="true" onClick={() => setMenu((o) => !o)}>
          <span aria-hidden="true" style={{ fontSize: "20px" }}>{courant.icone}</span>
          <span style={{ minWidth: 0, textAlign: "left" }}>
            <span className="fr-deroulant-petit">{moduleCourant.label}</span>
            <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{courant.label}</span>
          </span>
          {!menu && modules.some((m) => m.badge) && <span className="fr-side-badge">{modules.reduce((t, m) => t + (m.badge ?? 0), 0)}</span>}
          <span className="fr-deroulant-fleche" aria-hidden="true">▾</span>
        </button>
        {menu && (
          <>
            <div className="fr-deroulant-fond" onClick={() => setMenu(false)} aria-hidden="true" />
            <nav className="fr-deroulant-panneau" aria-label="Menu">
              {modules.map((m) => (
                <div key={m.id}>
                  {(modules.length > 1 || m.rubriques.length > 1) && <p className="fr-deroulant-groupe">{m.label}</p>}
                  {m.rubriques.map((x) => (
                    <button key={x.id} type="button" onClick={() => choisir(x.id)} className={`fr-deroulant-lien${x.id === courant.id ? " fr-actif" : ""}`} aria-current={x.id === courant.id ? "page" : undefined}>
                      <span aria-hidden="true" style={{ width: 24, textAlign: "center" }}>{x.icone}</span>
                      <span style={{ flex: 1 }}>{x.label}</span>
                      {!!x.badge && <span className="fr-side-badge">{x.badge}</span>}
                    </button>
                  ))}
                </div>
              ))}
              <div className="fr-deroulant-pied">
                <span>👤 {prenom}</span>
                <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>{profil}</div>
              </div>
            </nav>
          </>
        )}
      </div>

      <div className="flex">
        <aside className="fr-sidebar" aria-label={moduleCourant.label}>
          <p className="fr-side-titre">{moduleCourant.label}</p>
          {moduleCourant.rubriques.map((r) => (
            <button key={r.id} type="button" onClick={() => choisir(r.id)} className={`fr-side-lien${r.id === courant.id ? " fr-actif" : ""}`} aria-current={r.id === courant.id ? "page" : undefined} style={{ border: "none", background: r.id === courant.id ? undefined : "none", width: "100%", textAlign: "left", cursor: "pointer" }}>
              <span className="fr-side-icone" aria-hidden="true">{r.icone}</span>
              <span className="fr-side-texte">{r.label}</span>
              {!!r.badge && <span className="fr-side-badge">{r.badge}</span>}
            </button>
          ))}
        </aside>
        <main className="flex-1 p-4 md:p-8 flex flex-col gap-4" style={{ minWidth: 0, maxWidth: "900px" }}>
          <div className="bg-white rounded-xl shadow p-6 fr-es-titre-carte">
            <h1 className="text-3xl font-bold">{courant.icone} {courant.label}</h1>
          </div>
          {courant.contenu}
          <p className="text-center text-xs text-gray-500 mt-2">Vos demandes sont validées par votre manager ou votre employeur. Pour toute question sur votre paie, adressez-vous à lui.</p>
        </main>
      </div>
    </div>
  );
}
