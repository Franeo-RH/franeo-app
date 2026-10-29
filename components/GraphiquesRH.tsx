"use client";

// Petits graphiques SVG sans bibliothèque (légers, lisibles sur téléphone)

const ORANGE = "#f97316";
const PALETTE = ["#f97316", "#3b82f6", "#8b5cf6", "#10b981", "#ef4444", "#f59e0b", "#6b7280", "#ec4899"];

type Point = { label: string; valeur: number };

function Vide() {
  return <p style={{ margin: 0, color: "#9ca3af", fontSize: "13px", textAlign: "center", padding: "40px 0" }}>Aucune donnée sur la période</p>;
}

export function Courbe({ points, couleur = ORANGE, unite = "" }: { points: Point[]; couleur?: string; unite?: string }) {
  if (points.length === 0 || points.every((p) => p.valeur === 0)) return <Vide />;
  const L = 320, H = 150, m = 24;
  const max = Math.max(...points.map((p) => p.valeur), 1);
  const x = (i: number) => m + (points.length === 1 ? (L - 2 * m) / 2 : (i * (L - 2 * m)) / (points.length - 1));
  const y = (v: number) => H - m - (v / max) * (H - 2 * m);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.valeur)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${L} ${H}`} role="img" aria-label="Courbe" style={{ width: "100%", height: "auto" }}>
      <line x1={m} y1={H - m} x2={L - m} y2={H - m} stroke="#e5e7eb" />
      <path d={`${d} L${x(points.length - 1)},${H - m} L${x(0)},${H - m} Z`} fill={couleur} opacity={0.12} />
      <path d={d} fill="none" stroke={couleur} strokeWidth={2.5} strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.valeur)} r={3} fill={couleur}><title>{`${p.label} : ${p.valeur}${unite}`}</title></circle>
          {(points.length <= 12 || i % 2 === 0) && <text x={x(i)} y={H - 6} fontSize="9" textAnchor="middle" fill="#6b7280">{p.label}</text>}
          {points.length <= 12 && <text x={x(i)} y={y(p.valeur) - 6} fontSize="9" textAnchor="middle" fill="#374151">{p.valeur}</text>}
        </g>
      ))}
    </svg>
  );
}

export function Histogramme({ points, couleur = ORANGE, unite = "" }: { points: Point[]; couleur?: string; unite?: string }) {
  if (points.length === 0 || points.every((p) => p.valeur === 0)) return <Vide />;
  const L = 320, H = 150, m = 24;
  const max = Math.max(...points.map((p) => p.valeur), 1);
  const largeur = (L - 2 * m) / points.length;
  return (
    <svg viewBox={`0 0 ${L} ${H}`} role="img" aria-label="Histogramme" style={{ width: "100%", height: "auto" }}>
      <line x1={m} y1={H - m} x2={L - m} y2={H - m} stroke="#e5e7eb" />
      {points.map((p, i) => {
        const h = (p.valeur / max) * (H - 2 * m);
        const xx = m + i * largeur + largeur * 0.15;
        return (
          <g key={i}>
            <rect x={xx} y={H - m - h} width={largeur * 0.7} height={Math.max(h, p.valeur > 0 ? 2 : 0)} rx={3} fill={couleur}><title>{`${p.label} : ${p.valeur}${unite}`}</title></rect>
            {(points.length <= 12 || i % 2 === 0) && <text x={xx + largeur * 0.35} y={H - 6} fontSize="9" textAnchor="middle" fill="#6b7280">{p.label}</text>}
            {p.valeur > 0 && points.length <= 12 && <text x={xx + largeur * 0.35} y={H - m - h - 4} fontSize="9" textAnchor="middle" fill="#374151">{p.valeur}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export function Camembert({ parts, unite = "" }: { parts: Point[]; unite?: string }) {
  const total = parts.reduce((a, p) => a + p.valeur, 0);
  if (!total) return <Vide />;
  let angle = -Math.PI / 2;
  const R = 60, C = 70;
  return (
    <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
      <svg viewBox="0 0 140 140" role="img" aria-label="Camembert" style={{ width: "140px", height: "140px", flexShrink: 0 }}>
        {parts.map((p, i) => {
          const a = (p.valeur / total) * Math.PI * 2;
          const x1 = C + R * Math.cos(angle), y1 = C + R * Math.sin(angle);
          angle += a;
          const x2 = C + R * Math.cos(angle), y2 = C + R * Math.sin(angle);
          const chemin = parts.length === 1
            ? `M${C - R},${C} a${R},${R} 0 1,0 ${2 * R},0 a${R},${R} 0 1,0 ${-2 * R},0`
            : `M${C},${C} L${x1},${y1} A${R},${R} 0 ${a > Math.PI ? 1 : 0} 1 ${x2},${y2} Z`;
          return <path key={i} d={chemin} fill={PALETTE[i % PALETTE.length]} stroke="#ffffff" strokeWidth={1.5}><title>{`${p.label} : ${p.valeur}${unite}`}</title></path>;
        })}
        <circle cx={C} cy={C} r={28} fill="#ffffff" />
        <text x={C} y={C + 4} fontSize="13" fontWeight="700" textAnchor="middle" fill="#111827">{total}</text>
      </svg>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
        {parts.map((p, i) => (
          <li key={p.label} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "3px", background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
            {p.label} · <strong>{p.valeur}{unite}</strong> ({Math.round((p.valeur / total) * 100)} %)
          </li>
        ))}
      </ul>
    </div>
  );
}
