"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ACTIONS, MODULES } from "@/lib/droits";

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

  const moduleActif = (m: string) => perms.includes(m);
  const actionActive = (a: string) => !perms.includes(`-${a}`);

  function basculerModule(m: string) {
    setEtat("");
    setPerms((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]));
  }
  function basculerAction(a: string) {
    setEtat("");
    setPerms((p) => (p.includes(`-${a}`) ? p.filter((x) => x !== `-${a}`) : [...p, `-${a}`]));
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "18px" }}>
        <div>
          <p style={{ margin: "0 0 6px", fontWeight: 700 }}>Modules visibles</p>
          {MODULES.map((m) => <div key={m.id}>{case_(moduleActif(m.id), () => basculerModule(m.id), m.label)}</div>)}
        </div>
        <div>
          <p style={{ margin: "0 0 6px", fontWeight: 700 }}>Actions autorisées</p>
          {ACTIONS.map((a) => (
            <div key={a.id}>{case_(actionActive(a.id), () => basculerAction(a.id), a.label, a.module !== "global" && !moduleActif(a.module))}</div>
          ))}
        </div>
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
