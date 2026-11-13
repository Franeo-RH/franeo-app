"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ACCES_FORMULES, accesChoisi, ACTIONS, MODULES, permissionsFormule } from "@/lib/droits";

/** Bloc « Accès & droits » de la fiche client : modules visibles et actions autorisées */
export default function GestionDroits({
  entrepriseId,
  permissions,
  clientPaie,
}: {
  entrepriseId: string;
  permissions: string[];
  clientPaie: boolean;
}) {
  const router = useRouter();
  const [perms, setPerms] = useState<string[]>(permissions);
  const [etat, setEtat] = useState<"" | "chargement" | "ok" | "erreur">("");

  const choix = accesChoisi(perms) ?? "PERSO";
  // Toute case modifiée à la main fait passer en « Personnalisé »
  const perso = (p: string[]) => [...p.filter((x) => !x.startsWith("@acces:")), "@acces:PERSO"];
  const moduleActif = (m: string) => perms.includes(m);
  const actionActive = (a: string) => !perms.includes(`-${a}`);

  function basculerModule(m: string) {
    setEtat("");
    setPerms((p) => perso(p.includes(m) ? p.filter((x) => x !== m) : [...p, m]));
  }
  function basculerAction(a: string) {
    setEtat("");
    setPerms((p) => perso(p.includes(`-${a}`) ? p.filter((x) => x !== `-${a}`) : [...p, `-${a}`]));
  }

  function appliquerAcces(id: string) {
    setEtat("");
    if (id === "PERSO") setPerms((p) => perso(p));
    else setPerms((p) => permissionsFormule(id, p, clientPaie));
  }
  function toutModule(m: string, autoriser: boolean) {
    setEtat("");
    const ids = ACTIONS.filter((a) => a.module === m).map((a) => `-${a.id}`);
    setPerms((p) => perso(autoriser ? p.filter((x) => !ids.includes(x)) : [...p.filter((x) => !ids.includes(x)), ...ids]));
  }

  async function enregistrer() {
    setEtat("chargement");
    const res = await fetch(`/api/entreprises/${entrepriseId}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: perms }),
    });
    setEtat(res.ok ? "ok" : "erreur");
    if (res.ok) router.refresh();
  }

  const case_ = (coche: boolean, onChange: () => void, label: string, desactive = false) => (
    <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0", cursor: desactive ? "not-allowed" : "pointer", opacity: desactive ? 0.45 : 1 }}>
      <input type="checkbox" checked={coche && !desactive} disabled={desactive} onChange={onChange} style={{ width: "18px", height: "18px", accentColor: "#f97316" }} />
      <span style={{ fontSize: "14px" }}>{label}</span>
    </label>
  );

  return (
    <div>
      {clientPaie && (
        <p style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", borderRadius: "10px", padding: "10px 12px", fontSize: "13px", margin: "0 0 14px" }}>
          Client en paie : tout ajout, modification ou suppression de salarié devient une <strong>demande à valider</strong> (Salariés › Demandes clients), même si l&apos;action est cochée.
        </p>
      )}

      <p style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 8px" }}>Accès selon la formule :</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "8px", marginBottom: "12px" }}>
        {ACCES_FORMULES.map((f) => (
          <button key={f.id} type="button" onClick={() => appliquerAcces(f.id)} title={f.detail}
            style={{ textAlign: "left", background: choix === f.id ? "#f97316" : "#ffffff", color: choix === f.id ? "#ffffff" : "#111827", border: `2px solid ${choix === f.id ? "#f97316" : "#e5e7eb"}`, borderRadius: "12px", padding: "10px 12px", cursor: "pointer" }}>
            <span style={{ display: "block", fontWeight: 800, fontSize: "14px" }}>{f.id === "PERSO" ? "⚙️ " : "📦 "}Accès {f.label}</span>
            <span style={{ display: "block", fontSize: "11px", opacity: 0.85, marginTop: "2px" }}>{f.detail}</span>
          </button>
        ))}
      </div>
      <div style={{ marginBottom: "14px", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "12px", background: "#f9fafb" }}>
        {case_(moduleActif("espace-salaries"), () => { setEtat(""); setPerms((p) => (p.includes("espace-salaries") ? p.filter((x) => x !== "espace-salaries") : [...p, "espace-salaries"])); }, "📱 Espace salarié (inclus dans toutes les formules) — détaillez ci-dessous ce que les salariés peuvent faire")}
      </div>
      {choix !== "PERSO" && (
        <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 10px" }}>Le détail ci-dessous est réglé par la formule. Modifier une case passe en accès personnalisé.</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
        {[...MODULES, { id: "global", label: "🌐 Partout" }].map((m) => {
          const actions = ACTIONS.filter((a) => a.module === m.id);
          const actif = m.id === "global" || moduleActif(m.id);
          return (
            <div key={m.id} style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "10px 12px", background: actif ? "#ffffff" : "#f9fafb" }}>
              {m.id === "global"
                ? <p style={{ margin: "4px 0", fontWeight: 700 }}>{m.label}</p>
                : <div style={{ fontWeight: 700 }}>{case_(moduleActif(m.id), () => basculerModule(m.id), m.label)}</div>}
              {actions.length > 0 && (
                <div style={{ borderTop: "1px solid #f3f4f6", marginTop: "4px", paddingLeft: "6px" }}>
                  {actions.map((a) => <div key={a.id}>{case_(actionActive(a.id), () => basculerAction(a.id), a.label, !actif)}</div>)}
                  {actif && actions.length > 1 && (
                    <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                      <button type="button" onClick={() => toutModule(m.id, true)} style={{ background: "none", border: "none", color: "#15803d", fontSize: "12px", textDecoration: "underline", cursor: "pointer", padding: 0 }}>tout cocher</button>
                      <button type="button" onClick={() => toutModule(m.id, false)} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "12px", textDecoration: "underline", cursor: "pointer", padding: 0 }}>tout décocher</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "14px" }}>
        <button
          type="button"
          onClick={enregistrer}
          disabled={etat === "chargement"}
          style={{ background: "#f97316", color: "#ffffff", border: "none", borderRadius: "8px", padding: "10px 18px", fontWeight: 700, cursor: "pointer" }}
        >
          {etat === "chargement" ? "Enregistrement…" : "Enregistrer les accès"}
        </button>
        {etat === "ok" && <span style={{ color: "#15803d", fontSize: "14px" }}>✅ Enregistré</span>}
        {etat === "erreur" && <span style={{ color: "#b91c1c", fontSize: "14px" }}>Erreur, réessayez</span>}
      </div>
    </div>
  );
}
