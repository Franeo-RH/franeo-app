import type { Marge } from "@/lib/marges";

const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10} %` : "—");

/** Du CA catalogue à la marge nette, ligne par ligne */
export default function CascadeMarges({ m, titre }: { m: Marge; titre?: string }) {
  const lignes: { l: string; v: number; signe?: "-" ; fort?: boolean; couleur?: string; aide?: string }[] = [
    { l: "CA catalogue (avant remises)", v: m.caCatalogue },
    { l: "Remises et codes promo", v: m.remises, signe: "-", couleur: "#b91c1c" },
    { l: "CA réel", v: m.caReel, fort: true },
    { l: "Coûts directs", v: m.coutsDirects, signe: "-", couleur: "#b91c1c" },
    { l: "Marge brute", v: m.margeBrute, fort: true, couleur: "#15803d", aide: pct(m.margeBrute, m.caCatalogue) + " du CA catalogue" },
    { l: "Commissions reversées", v: m.commissions, signe: "-", couleur: "#6d28d9" },
    { l: "Charges et cotisations", v: m.charges, signe: "-", couleur: "#b91c1c" },
    { l: "Marge nette", v: m.margeNette, fort: true, couleur: "#15803d", aide: pct(m.margeNette, m.caCatalogue) + " du CA catalogue" },
  ];
  return (
    <div>
      {titre && <h3 className="font-bold mb-2">{titre}{m.estime ? <span className="text-xs text-gray-500 font-normal"> · estimation (facture pas encore générée)</span> : null}</h3>}
      <table className="w-full text-sm fr-tableau-simple">
        <tbody>
          {lignes.map((x) => (
            <tr key={x.l} className={x.fort ? "border-t" : ""}>
              <td className={`py-1 ${x.fort ? "font-bold" : "pl-3 text-gray-600"}`}>{x.signe ? "− " : ""}{x.l}{x.aide && <span className="block text-xs text-gray-400 font-normal">{x.aide}</span>}</td>
              <td className={`py-1 text-right ${x.fort ? "font-bold" : ""}`} style={{ color: x.couleur }}>{x.signe && x.v ? `− ${eur(x.v)}` : eur(x.v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
