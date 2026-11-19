// Graphique en barres des factures émises (12 derniers mois), rendu côté serveur en SVG
type Mois = { label: string; montant: number; nb: number; enCours?: boolean };

const eur = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €";

export default function GraphiqueFactures({ mois }: { mois: Mois[] }) {
  const max = Math.max(...mois.map((m) => m.montant), 1);
  const total = mois.reduce((t, m) => t + m.montant, 0);
  const nb = mois.reduce((t, m) => t + m.nb, 0);
  const L = 1000, H = 220, bas = 28, haut = 22, pas = L / mois.length, largeur = Math.min(40, pas * 0.62);
  return (
    <section className="bg-white rounded-2xl shadow p-4" aria-labelledby="t-factures">
      <div className="flex justify-between items-baseline gap-3 flex-wrap mb-2">
        <h2 id="t-factures" className="text-sm font-bold">🧾 Factures émises · 12 derniers mois</h2>
        <p className="text-sm text-gray-500"><strong className="text-gray-900">{eur(total)}</strong> · {nb} facture{nb > 1 ? "s" : ""}</p>
      </div>
      {total === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">Aucune facture émise pour l&apos;instant : le graphique se remplira avec la facturation mensuelle.</p>
      ) : (
        <svg viewBox={`0 0 ${L} ${H}`} role="img" aria-label="Montant des factures émises par mois" style={{ width: "100%", height: "auto", display: "block" }}>
          <line x1="0" x2={L} y1={H - bas} y2={H - bas} stroke="#e5e7eb" />
          {mois.map((m, i) => {
            const h = ((H - bas - haut) * m.montant) / max;
            const x = i * pas + (pas - largeur) / 2;
            const y = H - bas - h;
            return (
              <g key={m.label}>
                <title>{`${m.label} : ${eur(m.montant)} (${m.nb} facture${m.nb > 1 ? "s" : ""})`}</title>
                {m.montant > 0 && <rect x={x} y={y} width={largeur} height={h} rx="5" fill={m.enCours ? "#fdba74" : "#f97316"} />}
                {m.montant > 0 && <text x={x + largeur / 2} y={y - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="#374151">{m.montant >= 1000 ? `${(m.montant / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k` : Math.round(m.montant)}</text>}
                <text x={i * pas + pas / 2} y={H - 9} textAnchor="middle" fontSize="11" fill="#6b7280">{m.label}</text>
              </g>
            );
          })}
        </svg>
      )}
      <p className="text-xs text-gray-400 mt-1">Barre claire : mois en cours (factures déjà générées).</p>
    </section>
  );
}
