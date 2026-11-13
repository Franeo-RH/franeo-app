"use client";

import { useCallback, useEffect, useState } from "react";
import { fmtH } from "@/lib/heures";

type P = { id: string; type: string; at: string; dansZone: boolean | null; motif: string | null; etablissement: string | null };
type Etat = { jour: string; pointages: P[]; actions: string[]; heures: number; controleZone: boolean };

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

  const charger = useCallback(async () => {
    const r = await fetch("/api/espace-salarie/badge");
    const d = await r.json().catch(() => ({}));
    if (r.ok) setEtat(d); else setMsg({ ok: false, t: d.erreur || "Badge indisponible" });
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
    const res = await fetch("/api/espace-salarie/badge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, ...(pos ?? {}) }) });
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
                <span>{TYPES[p.type]?.icone} <strong>{TYPES[p.type]?.label}</strong> à {heure(p.at)}</span>
                <span style={{ color: p.dansZone === false ? "#b91c1c" : p.dansZone ? "#15803d" : "#6b7280", fontSize: "13px", textAlign: "right" }}>
                  {p.dansZone === true ? `✓ ${p.etablissement ?? "dans la zone"}` : p.dansZone === false ? "⚠️ hors zone" : p.motif ?? ""}
                </span>
              </li>
            ))}
          </ul>
          <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#6b7280" }}>Vos heures sont reportées automatiquement dans votre relevé mensuel (onglet Mon temps), que vous pouvez compléter avant de l&apos;envoyer.</p>
        </section>
      )}

      {!compact && <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", lineHeight: 1.5 }}>
        🔒 {etat?.controleZone
          ? "Votre position est demandée uniquement au moment où vous pointez, pour vérifier que vous êtes sur votre lieu de travail. Elle n'est ni suivie ni conservée : seul le résultat « dans la zone / hors zone » est enregistré, pendant un an maximum."
          : "Aucune position n'est demandée pour vos pointages."} Pour toute question, adressez-vous à votre employeur.
      </p>}
    </>
  );
}
