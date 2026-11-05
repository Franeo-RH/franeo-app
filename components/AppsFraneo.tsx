import Image from "next/image";
import { APPS_FRANEO } from "@/lib/apps-franeo";

/** Boutons vers les autres applications Franeo, chacun dans sa couleur (logos de même taille, même fond) */
export default function AppsFraneo({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? 150 : 200}px, 1fr))`, gap: "10px" }}>
      {APPS_FRANEO.map((a) => (
        <a
          key={a.code}
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: "10px", background: "#ffffff", border: `2px solid ${a.couleur}`, borderRadius: "14px", padding: compact ? "8px 10px" : "12px", textDecoration: "none", color: "#111827" }}
        >
          <span style={{ width: compact ? 34 : 44, height: compact ? 34 : 44, flexShrink: 0, borderRadius: "10px", background: a.fond, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Image src={a.logo} alt="" width={compact ? 26 : 34} height={compact ? 26 : 34} style={{ objectFit: "contain" }} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontWeight: 800, fontSize: compact ? "13px" : "15px", color: a.couleur }}>{a.nom} ↗</span>
            {!compact && <span style={{ display: "block", fontSize: "12px", color: "#6b7280" }}>{a.description}</span>}
          </span>
        </a>
      ))}
    </div>
  );
}
