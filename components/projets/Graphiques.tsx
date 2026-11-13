"use client";

// Petits graphiques en SVG, sans bibliothèque : barres (groupées ou empilées), courbes et anneau.
// Les valeurs exactes s'affichent au survol (infobulle) et dans la légende.

type Serie = { nom: string; couleur: string; valeurs: number[]; type?: "barre" | "ligne"; pointille?: boolean };

const H = 220, MG = 46, MD = 12, MH = 12, MB = 26;

function graduations(min: number, max: number) {
  const etendue = max - min || 1;
  const pas0 = etendue / 4;
  const p10 = 10 ** Math.floor(Math.log10(pas0));
  const pas = [1, 2, 2.5, 5, 10].map((x) => x * p10).find((x) => x >= pas0) ?? pas0;
  const bas = Math.floor(min / pas) * pas, haut = Math.ceil(max / pas) * pas;
  const t: number[] = [];
  for (let v = bas; v <= haut + pas / 2; v += pas) t.push(Math.round(v * 100) / 100);
  return { bas, haut: haut === bas ? bas + pas : haut, t };
}

const court = (n: number) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M` : Math.abs(n) >= 1e3 ? `${(n / 1e3).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k` : n.toLocaleString("fr-FR", { maximumFractionDigits: 1 }));

/** Graphique mixte : barres (groupées ou empilées) + lignes, axe Y commun */
export function Graphique({ etiquettes, series, format = (n) => n.toLocaleString("fr-FR"), empile = false, largeur = 640, ligneZero = true }: {
  etiquettes: string[]; series: Serie[]; format?: (n: number) => string; empile?: boolean; largeur?: number; ligneZero?: boolean;
}) {
  const barres = series.filter((s) => s.type !== "ligne"), lignes = series.filter((s) => s.type === "ligne");
  const n = etiquettes.length;
  const vals: number[] = [0];
  for (let i = 0; i < n; i++) {
    if (empile) { vals.push(barres.reduce((t, s) => t + Math.max(0, s.valeurs[i] ?? 0), 0)); vals.push(barres.reduce((t, s) => t + Math.min(0, s.valeurs[i] ?? 0), 0)); }
    else barres.forEach((s) => vals.push(s.valeurs[i] ?? 0));
    lignes.forEach((s) => vals.push(s.valeurs[i] ?? 0));
  }
  const g = graduations(Math.min(...vals), Math.max(...vals));
  const W = largeur, zoneL = W - MG - MD, zoneH = H - MH - MB;
  const y = (v: number) => MH + zoneH - ((v - g.bas) / (g.haut - g.bas)) * zoneH;
  const pasX = zoneL / Math.max(1, n);
  const xc = (i: number) => MG + pasX * i + pasX / 2;
  const lb = pasX * 0.7;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={series.map((s) => s.nom).join(", ")} style={{ display: "block", overflow: "visible" }}>
        {g.t.map((v) => (
          <g key={v}>
            <line x1={MG} x2={W - MD} y1={y(v)} y2={y(v)} stroke={v === 0 && ligneZero ? "#9ca3af" : "#e5e7eb"} strokeWidth={1} />
            <text x={MG - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#6b7280">{court(v)}</text>
          </g>
        ))}
        {etiquettes.map((e, i) => <text key={i} x={xc(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#6b7280">{e}</text>)}
        {etiquettes.map((_, i) => {
          if (empile) {
            let haut = 0, bas = 0;
            return barres.map((s) => {
              const v = s.valeurs[i] ?? 0;
              const de = v >= 0 ? haut : bas, a = de + v;
              if (v >= 0) haut = a; else bas = a;
              return <rect key={`${s.nom}${i}`} x={xc(i) - lb / 2} width={lb} y={y(Math.max(de, a))} height={Math.max(0, Math.abs(y(de) - y(a)))} fill={s.couleur} rx={2}><title>{`${etiquettes[i]} · ${s.nom} : ${format(v)}`}</title></rect>;
            });
          }
          const lu = lb / Math.max(1, barres.length);
          return barres.map((s, k) => {
            const v = s.valeurs[i] ?? 0;
            return <rect key={`${s.nom}${i}`} x={xc(i) - lb / 2 + k * lu} width={Math.max(1, lu - 1)} y={y(Math.max(0, v))} height={Math.max(0, Math.abs(y(0) - y(v)))} fill={s.couleur} rx={2}><title>{`${etiquettes[i]} · ${s.nom} : ${format(v)}`}</title></rect>;
          });
        })}
        {lignes.map((s) => (
          <g key={s.nom}>
            <polyline fill="none" stroke={s.couleur} strokeWidth={2.5} strokeDasharray={s.pointille ? "6 4" : undefined} points={s.valeurs.map((v, i) => `${xc(i)},${y(v ?? 0)}`).join(" ")} />
            {s.valeurs.map((v, i) => <circle key={i} cx={xc(i)} cy={y(v ?? 0)} r={3.5} fill={s.couleur}><title>{`${etiquettes[i]} · ${s.nom} : ${format(v ?? 0)}`}</title></circle>)}
          </g>
        ))}
      </svg>
      <Legende items={series.map((s) => ({ nom: s.nom, couleur: s.couleur, ligne: s.type === "ligne" }))} />
    </div>
  );
}

export function Legende({ items }: { items: { nom: string; couleur: string; ligne?: boolean; detail?: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
      {items.map((x) => (
        <span key={x.nom} className="flex items-center gap-1">
          <span style={{ width: 12, height: x.ligne ? 3 : 12, borderRadius: x.ligne ? 0 : 3, background: x.couleur, display: "inline-block" }} />
          {x.nom}{x.detail ? ` · ${x.detail}` : ""}
        </span>
      ))}
    </div>
  );
}

const PALETTE = ["#ea580c", "#2563eb", "#16a34a", "#9333ea", "#db2777", "#0891b2", "#ca8a04", "#4b5563"];

/** Anneau de répartition (les plus petites parts sont regroupées dans « Autres ») */
export function Anneau({ parts, format = (n) => n.toLocaleString("fr-FR"), max = 6 }: { parts: { nom: string; valeur: number; couleur?: string }[]; format?: (n: number) => string; max?: number }) {
  const tri = [...parts].filter((p) => p.valeur > 0).sort((a, b) => b.valeur - a.valeur);
  const visibles = tri.slice(0, max);
  const reste = tri.slice(max).reduce((t, p) => t + p.valeur, 0);
  if (reste > 0) visibles.push({ nom: "Autres", valeur: reste, couleur: "#d1d5db" });
  const total = visibles.reduce((t, p) => t + p.valeur, 0);
  if (!total) return <p className="text-sm text-gray-500">Pas encore de données.</p>;
  const R = 70, r = 44, C = 90;
  let angle = -Math.PI / 2;
  const arcs = visibles.map((p, i) => {
    const a = (p.valeur / total) * Math.PI * 2;
    const a0 = angle, a1 = angle + Math.min(a, Math.PI * 2 - 0.0001);
    angle += a;
    const g = a > Math.PI ? 1 : 0;
    const pt = (rr: number, t: number) => `${C + rr * Math.cos(t)},${C + rr * Math.sin(t)}`;
    return { ...p, couleur: p.couleur || PALETTE[i % PALETTE.length], d: `M${pt(R, a0)} A${R},${R} 0 ${g} 1 ${pt(R, a1)} L${pt(r, a1)} A${r},${r} 0 ${g} 0 ${pt(r, a0)} Z` };
  });
  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg viewBox="0 0 180 180" width="170" role="img" aria-label="Répartition">
        {arcs.map((x) => <path key={x.nom} d={x.d} fill={x.couleur} stroke="#ffffff" strokeWidth={1.5}><title>{`${x.nom} : ${format(x.valeur)} (${Math.round((x.valeur / total) * 100)} %)`}</title></path>)}
        <text x={C} y={C - 2} textAnchor="middle" fontSize="15" fontWeight="700" fill="#111827">{court(total)}</text>
        <text x={C} y={C + 14} textAnchor="middle" fontSize="10" fill="#6b7280">total</text>
      </svg>
      <ul className="text-sm space-y-1 flex-1 min-w-[160px]">
        {arcs.map((x) => (
          <li key={x.nom} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 truncate"><span style={{ width: 10, height: 10, borderRadius: 99, background: x.couleur, flexShrink: 0 }} /><span className="truncate">{x.nom}</span></span>
            <span className="text-gray-600 whitespace-nowrap">{format(x.valeur)} · {Math.round((x.valeur / total) * 100)} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
