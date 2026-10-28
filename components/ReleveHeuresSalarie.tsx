"use client";

import { useCallback, useEffect, useState } from "react";
import CalendrierReleve, { absenceDuJour, styleAbsence } from "@/components/CalendrierReleve";
import { LIBELLES_ABSENCE } from "@/lib/espace-salarie";
import { fmtH, joursDuMois, lireHeures, NOMS_MOIS, STATUTS_RELEVE, type AbsenceReleve, type JourReleve } from "@/lib/heures";

type Saisie = { heures: string; heuresSupp: string; commentaire: string };
const vide: Saisie = { heures: "", heuresSupp: "", commentaire: "" };
const versTexte = (n: number | null | undefined) => (n == null || n === 0 ? "" : String(n).replace(".", ","));

const champ: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px", fontSize: "16px", background: "#ffffff", marginTop: "4px" };
const label: React.CSSProperties = { fontSize: "13px", fontWeight: 600, color: "#374151" };

/** Relevé d'activité mensuel : calendrier, saisie au fil du mois, puis envoi définitif */
export default function ReleveHeuresSalarie() {
  const maintenant = new Date();
  const [mois, setMois] = useState(maintenant.getMonth() + 1);
  const [annee, setAnnee] = useState(maintenant.getFullYear());
  const [statut, setStatut] = useState("Brouillon");
  const [motifRefus, setMotifRefus] = useState<string | null>(null);
  const [absences, setAbsences] = useState<AbsenceReleve[]>([]);
  const [saisie, setSaisie] = useState<Record<string, Saisie>>({});
  const [selection, setSelection] = useState<string | null>(null);
  const [modifie, setModifie] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [remplir, setRemplir] = useState("7");

  const modifiable = statut === "Brouillon" || statut === "Refusé";
  const jours = joursDuMois(mois, annee);

  const charger = useCallback(async (m: number, a: number) => {
    const d = await fetch(`/api/espace-salarie/heures?mois=${m}&annee=${a}`).then((r) => r.json()).catch(() => null);
    if (!d || d.erreur) return;
    setStatut(d.statut);
    setMotifRefus(d.motifRefus);
    setAbsences(d.absences || []);
    const s: Record<string, Saisie> = {};
    for (const j of d.jours as JourReleve[]) s[j.date] = { heures: versTexte(j.heures), heuresSupp: versTexte(j.heuresSupp), commentaire: j.commentaire || "" };
    setSaisie(s);
    setModifie(false);
    setSelection(null);
  }, []);

  useEffect(() => { charger(mois, annee); }, [mois, annee, charger]);

  function changerMois(n: number) {
    if (modifie && !confirm("Vous avez des modifications non enregistrées. Changer de mois quand même ?")) return;
    const d = new Date(annee, mois - 1 + n, 1);
    setMois(d.getMonth() + 1);
    setAnnee(d.getFullYear());
    setMessage(null);
  }

  function maj(iso: string, champ: keyof Saisie, valeur: string) {
    setSaisie((s) => ({ ...s, [iso]: { ...(s[iso] || vide), [champ]: valeur } }));
    setModifie(true);
  }

  function remplirOuvres() {
    const h = lireHeures(remplir);
    if (h === null || Number.isNaN(h)) { alert("Indiquez un nombre d'heures valide (ex : 7 ou 7h30)."); return; }
    setSaisie((s) => {
      const n = { ...s };
      for (const iso of jours) {
        const jour = new Date(`${iso}T12:00:00Z`).getUTCDay();
        if (jour === 0 || jour === 6) continue; // week-end
        if (absenceDuJour(absences, iso)) continue; // jour d'absence
        if (n[iso]?.heures) continue; // déjà saisi
        n[iso] = { ...(n[iso] || vide), heures: String(h).replace(".", ",") };
      }
      return n;
    });
    setModifie(true);
  }

  async function enregistrer(envoyer: boolean) {
    if (envoyer && !confirm(`Envoyer votre relevé de ${NOMS_MOIS[mois - 1]} ${annee} ?\n\nUne fois envoyé, vous ne pourrez plus le modifier.`)) return;
    setEnvoi(true);
    setMessage(null);
    const corps = { mois, annee, envoyer, jours: Object.entries(saisie).map(([date, v]) => ({ date, ...v })) };
    const res = await fetch("/api/espace-salarie/heures", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    const d = await res.json().catch(() => ({}));
    setEnvoi(false);
    setMessage({ ok: res.ok, texte: res.ok ? d.message : `❌ ${d.erreur || "Erreur"}` });
    if (res.ok) charger(mois, annee);
  }

  // Valeurs affichées dans le calendrier (à partir de la saisie en cours)
  const pourCalendrier: Record<string, JourReleve> = {};
  let totH = 0;
  let totS = 0;
  for (const [iso, v] of Object.entries(saisie)) {
    const h = lireHeures(v.heures);
    const s = lireHeures(v.heuresSupp);
    const hOk = h !== null && !Number.isNaN(h) ? h : null;
    const sOk = s !== null && !Number.isNaN(s) ? s : 0;
    if (hOk === null && !sOk && !v.commentaire) continue;
    pourCalendrier[iso] = { date: iso, heures: hOk, heuresSupp: sOk, commentaire: v.commentaire || null };
    totH += hOk || 0;
    totS += sOk;
  }

  const st = STATUTS_RELEVE[statut] || STATUTS_RELEVE.Brouillon;
  const absSel = selection ? absenceDuJour(absences, selection) : null;
  const s = selection ? saisie[selection] || vide : vide;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <button type="button" onClick={() => changerMois(-1)} aria-label="Mois précédent" style={{ border: "1px solid #d1d5db", background: "#ffffff", borderRadius: "8px", padding: "8px 14px", cursor: "pointer" }}>◀</button>
        <p style={{ margin: 0, fontWeight: 700, fontSize: "17px" }}>{NOMS_MOIS[mois - 1]} {annee}</p>
        <button type="button" onClick={() => changerMois(1)} aria-label="Mois suivant" style={{ border: "1px solid #d1d5db", background: "#ffffff", borderRadius: "8px", padding: "8px 14px", cursor: "pointer" }}>▶</button>
      </div>

      <div style={{ background: st.fond, color: st.texte, borderRadius: "10px", padding: "8px 12px", fontSize: "14px", fontWeight: 700 }}>
        {st.libelle}
        {statut === "Refusé" && motifRefus && <span style={{ display: "block", fontWeight: 400 }}>Motif : {motifRefus}</span>}
      </div>

      <CalendrierReleve premier={jours[0]} jours={pourCalendrier} absences={absences} selection={selection} onSelect={(iso) => setSelection(selection === iso ? null : iso)} />

      {selection && (
        <div style={{ border: "2px solid #fed7aa", background: "#fff7ed", borderRadius: "12px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <p style={{ margin: 0, fontWeight: 700 }}>
            {new Date(`${selection}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
          </p>
          {absSel && (
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: styleAbsence(absSel.type).texte }}>
              🏷️ {LIBELLES_ABSENCE[absSel.type] || absSel.type}{absSel.statut === "En attente" ? " (demande en attente)" : ""}
            </p>
          )}
          {modifiable ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
                <label style={label}>Heures travaillées<input inputMode="decimal" placeholder="ex : 7 ou 7h30" value={s.heures} onChange={(e) => maj(selection, "heures", e.target.value)} style={champ} /></label>
                <label style={label}>dont heures supp<input inputMode="decimal" placeholder="0" value={s.heuresSupp} onChange={(e) => maj(selection, "heuresSupp", e.target.value)} style={champ} /></label>
              </div>
              <label style={label}>Commentaire<input maxLength={300} value={s.commentaire} onChange={(e) => maj(selection, "commentaire", e.target.value)} placeholder="facultatif" style={champ} /></label>
              <button type="button" onClick={() => setSelection(null)} style={{ alignSelf: "flex-end", background: "#111827", color: "#ffffff", border: "none", borderRadius: "8px", padding: "8px 16px", fontWeight: 600, cursor: "pointer" }}>OK</button>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: "14px" }}>
              {fmtH(pourCalendrier[selection]?.heures)}{pourCalendrier[selection]?.heuresSupp ? ` · dont ${fmtH(pourCalendrier[selection].heuresSupp)} supp.` : ""}
              {pourCalendrier[selection]?.commentaire ? ` · ${pourCalendrier[selection].commentaire}` : ""}
            </p>
          )}
        </div>
      )}

      {modifiable && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "14px" }}>
          <span>Remplir les jours ouvrés vides avec</span>
          <input inputMode="decimal" value={remplir} onChange={(e) => setRemplir(e.target.value)} aria-label="Heures par jour" style={{ ...champ, width: "70px", marginTop: 0, padding: "6px", textAlign: "center" }} />
          <span>h</span>
          <button type="button" onClick={remplirOuvres} style={{ border: "1px solid #f97316", color: "#ea580c", background: "#ffffff", borderRadius: "8px", padding: "6px 12px", fontWeight: 600, cursor: "pointer" }}>Remplir</button>
        </div>
      )}

      <p style={{ margin: 0, fontSize: "14px" }}>
        Total du mois : <strong>{fmtH(totH)}</strong>{totS > 0 && <> dont <strong style={{ color: "#c2410c" }}>{fmtH(totS)} supp.</strong></>}
      </p>

      {modifiable && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
          <button type="button" disabled={envoi} onClick={() => enregistrer(false)} style={{ background: "#ffffff", color: "#111827", border: "2px solid #111827", borderRadius: "10px", padding: "12px", fontSize: "15px", fontWeight: 700, cursor: "pointer", opacity: envoi ? 0.6 : 1 }}>
            💾 Enregistrer{modifie ? " *" : ""}
          </button>
          <button type="button" disabled={envoi} onClick={() => enregistrer(true)} style={{ background: "#f97316", color: "#ffffff", border: "none", borderRadius: "10px", padding: "12px", fontSize: "15px", fontWeight: 700, cursor: "pointer", opacity: envoi ? 0.6 : 1 }}>
            📤 Envoyer le relevé
          </button>
        </div>
      )}

      {message && <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: message.ok ? "#15803d" : "#b91c1c" }}>{message.texte}</p>}
      <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>
        Touchez un jour pour saisir vos heures. Enregistrez au fil du mois, puis envoyez le relevé : il ne sera plus modifiable. Vos absences s&apos;affichent automatiquement.
      </p>
    </div>
  );
}
