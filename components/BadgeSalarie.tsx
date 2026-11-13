"use client";

import { useCallback, useEffect, useState } from "react";
import { fmtH } from "@/lib/heures";

type P = { id: string; type: string; at: string; adresse: string | null; projet?: { nom: string; couleur: string } | null };
type Etat = { jour: string; pointages: P[]; actions: string[]; heures: number; controleZone: boolean; projets?: { id: string; nom: string; code: string | null; couleur: string }[]; projetsPlanifies?: boolean };

const TYPES: Record<string, { label: string; icone: string; fond: string }> = {
  ARRIVEE: { label: "Arrivée", icone: "🟢", fond: "#16a34a" },
  PAUSE: { label: "Pause", icone: "☕", fond: "#f59e0b" },
  REPRISE: { label: "Reprise", icone: "▶️", fond: "#2563eb" },
  DEPART: { label: "Départ", icone: "🔴", fond: "#dc2626" },
};
const carte: React.CSSProperties = { background: "#ffffff", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", padding: "18px" };
const heure = (d: string) => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

function position(): Promise<{ latitude: number; longitude: number; precision: number } | null> {
  return new Promise((ok) => {
    if (!navigator.geolocation) return ok(null);
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ latitude: p.coords.latitude, longitude: p.coords.longitude, precision: p.coords.accuracy }),
      () => ok(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });
}

/** Badge du salarié : arrivée, pause, reprise, départ, avec contrôle de zone au moment du pointage */
export default function BadgeSalarie({ compact = false }: { compact?: boolean }) {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [maintenant, setMaintenant] = useState(new Date());
  const [projetId, setProjetId] = useState("");

  const charger = useCallback(async () => {
    const r = await fetch("/api/espace-salarie/badge");
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      setEtat(d);
      // Un seul projet planifié aujourd'hui : il est présélectionné
      if (d.projetsPlanifies && d.projets?.length === 1) setProjetId((x) => x || d.projets[0].id);
    } else setMsg({ ok: false, t: d.erreur || "Badge indisponible" });
  }, []);
  useEffect(() => { charger(); const t = setInterval(() => setMaintenant(new Date()), 30000); return () => clearInterval(t); }, [charger]);

  async function pointer(type: string) {
    setOccupe(type); setMsg(null);
    const pos = etat?.controleZone ? await position() : null;
    if (etat?.controleZone && !pos) {
      setOccupe(null);
      setMsg({ ok: false, t: "📍 Votre position est nécessaire pour pointer. Autorisez la localisation pour ce site dans les réglages de votre navigateur (ou de votre téléphone), puis réessayez." });
      return;
    }
    const res = await fetch("/api/espace-salarie/badge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, ...(pos ?? {}), ...(projetId && (type === "ARRIVEE" || type === "REPRISE") ? { projetId } : {}) }) });
    const d = await res.json().catch(() => ({}));
    setOccupe(null);
    setMsg(res.ok ? { ok: true, t: d.message } : { ok: false, t: d.erreur || "Pointage impossible" });
    charger();
  }

  const dernier = etat?.pointages[etat.pointages.length - 1]?.type;
  const statut = !dernier ? "Pas encore arrivé" : dernier === "DEPART" ? "Journée terminée" : dernier === "PAUSE" ? "En pause" : "En poste";

  return (
    <>
      <section style={{ ...carte, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: "40px", fontWeight: 800 }}>{maintenant.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
        <p style={{ margin: "2px 0 0", color: "#6b7280", fontSize: "14px" }}>{maintenant.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
        <p style={{ margin: "10px 0 0", fontWeight: 700 }}>{statut}{etat && etat.heures > 0 ? ` · ${fmtH(etat.heures)} aujourd'hui` : ""}</p>
        {!!etat?.projets?.length && etat.actions.some((x) => x === "ARRIVEE" || x === "REPRISE") && (
          <label style={{ display: "block", marginTop: "14px", textAlign: "left", fontSize: "14px", fontWeight: 600 }}>
            📐 Projet {etat.projetsPlanifies ? "(vous êtes planifié dessus aujourd'hui)" : ""}
            <select value={projetId} onChange={(e) => setProjetId(e.target.value)} style={{ display: "block", width: "100%", marginTop: "6px", padding: "10px", borderRadius: "10px", border: "1px solid #d1d5db", fontSize: "15px", background: "#ffffff", color: "#111827" }}>
              <option value="">— Sans projet —</option>
              {etat.projets.map((p) => <option key={p.id} value={p.id}>{p.code ? `${p.code} · ` : ""}{p.nom}</option>)}
            </select>
          </label>
        )}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${etat?.actions.length || 1}, minmax(0, 1fr))`, gap: "10px", marginTop: "16px" }}>
          {(etat?.actions || []).map((a) => (
            <button key={a} type="button" disabled={!!occupe} onClick={() => pointer(a)}
              style={{ background: TYPES[a].fond, color: "#ffffff", border: "none", borderRadius: "14px", padding: "22px 10px", fontSize: "19px", fontWeight: 800, cursor: "pointer", opacity: occupe && occupe !== a ? 0.5 : 1 }}>
              {occupe === a ? "📍 Localisation…" : `${TYPES[a].icone} ${TYPES[a].label}`}
            </button>
          ))}
        </div>
        {msg && <p style={{ margin: "12px 0 0", fontSize: "14px", fontWeight: 600, color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.t}</p>}
      </section>

      {!compact && etat && etat.pointages.length > 0 && (
        <section style={carte}>
          <h2 style={{ margin: "0 0 8px", fontSize: "17px" }}>Mes pointages du jour</h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {etat.pointages.map((p) => (
              <li key={p.id} style={{ borderTop: "1px solid #f3f4f6", padding: "9px 0", display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "14px" }}>
                <span>{TYPES[p.type]?.icone} <strong>{TYPES[p.type]?.label}</strong> à {heure(p.at)}{p.projet ? <span style={{ display: "block", fontSize: "12px", color: p.projet.couleur, fontWeight: 600 }}>📐 {p.projet.nom}</span> : null}</span>
                <span style={{ color: "#6b7280", fontSize: "13px", textAlign: "right" }}>📍 {p.adresse ?? ""}</span>
              </li>
            ))}
          </ul>
          <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#6b7280" }}>Vos heures sont reportées automatiquement dans votre relevé mensuel (onglet Mon temps), que vous pouvez compléter avant de l&apos;envoyer.</p>
        </section>
      )}

      {!compact && <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", lineHeight: 1.5 }}>
        🔒 Votre position est demandée uniquement au moment où vous pointez (aucun suivi en continu). L&apos;adresse du lieu de pointage est enregistrée et visible par votre employeur, pendant un an maximum. Pour toute question, adressez-vous à votre employeur.
      </p>}
    </>
  );
}
