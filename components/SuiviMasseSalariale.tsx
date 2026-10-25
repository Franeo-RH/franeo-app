import Link from "next/link";
import type { MasseSalariale } from "@/lib/masse-salariale";

const NOMS_MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const eur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;

/** Suivi global détaillé : salaires, retenues d'absences, variables, charges et coût employeur */
export default function SuiviMasseSalariale({
  data,
  afficherEntreprise = false,
  lienSalarie,
}: {
  data: MasseSalariale;
  afficherEntreprise?: boolean;
  lienSalarie?: string; // ex. "/client/salaries"
}) {
  const t = data.totaux;
  const tuiles = [
    { label: "Salaires de base", valeur: eur(t.base), detail: `${t.nbSalaries} salarié(s)`, couleur: "#111827" },
    { label: "Retenues absences", valeur: t.retenueSansSolde + t.retenueMaladie > 0 ? `−${eur(t.retenueSansSolde + t.retenueMaladie)}` : eur(0), detail: `${t.joursSansSolde} j sans solde · ${t.joursMaladie} j maladie`, couleur: "#b91c1c" },
    { label: "Variables (brut)", valeur: eur(t.variablesBrut), detail: `HS ${eur(t.heuresSuppBrut)} (${t.heuresSupp} h) · primes ${eur(t.primes)}`, couleur: "#c2410c" },
    { label: "Salaire brut total", valeur: eur(t.brut), detail: "base − retenues + variables", couleur: "#111827" },
    { label: "Charges patronales", valeur: eur(t.charges), detail: "selon le taux de l'entreprise", couleur: "#111827" },
    { label: "Coût des variables", valeur: eur(t.coutVariables), detail: `chargées + notes de frais ${eur(t.notesFrais)}`, couleur: "#c2410c" },
    { label: "Coût employeur total", valeur: eur(t.coutTotal), detail: t.acomptes > 0 ? `acomptes versés : ${eur(t.acomptes)}` : "brut + charges + frais", couleur: "#ffffff", fond: "#f97316" },
  ];

  return (
    <section className="bg-white rounded-xl shadow p-6 mb-6" aria-labelledby="titre-masse">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
        <h2 id="titre-masse" className="text-xl font-bold" style={{ margin: 0 }}>📈 Suivi global — {NOMS_MOIS[data.mois - 1]} {data.annee}</h2>
        <p className="text-xs text-gray-500" style={{ margin: 0 }}>
          Estimation : retenue = salaire ÷ 21,67 × jours d&apos;absence (sans solde, maladie)
        </p>
      </div>

      <div className="fr-grille-tuiles" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "18px" }}>
        {tuiles.map((x) => (
          <div key={x.label} style={{ borderRadius: "12px", padding: "12px", background: x.fond || "#f9fafb", border: x.fond ? "none" : "1px solid #f3f4f6" }}>
            <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: x.fond ? "#ffedd5" : "#6b7280" }}>{x.label}</p>
            <p style={{ margin: "4px 0 2px", fontSize: "22px", fontWeight: 800, color: x.couleur }}>{x.valeur}</p>
            <p style={{ margin: 0, fontSize: "12px", color: x.fond ? "#ffedd5" : "#6b7280" }}>{x.detail}</p>
          </div>
        ))}
      </div>

      {data.lignes.length === 0 ? (
        <p className="text-gray-500 text-sm">Aucun salarié actif sur ce mois.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="pb-2">Salarié</th>
                {afficherEntreprise && <th className="pb-2">Entreprise</th>}
                <th className="pb-2">Base</th>
                <th className="pb-2">Absences</th>
                <th className="pb-2">Heures supp.</th>
                <th className="pb-2">Primes</th>
                <th className="pb-2">Brut</th>
                <th className="pb-2">Charges</th>
                <th className="pb-2">Frais</th>
                <th className="pb-2">Coût total</th>
              </tr>
            </thead>
            <tbody>
              {data.lignes.map((l) => (
                <tr key={l.salarieId} className="border-b">
                  <td className="py-2 font-semibold">
                    {lienSalarie ? <Link href={`${lienSalarie}/${l.salarieId}`} className="hover:underline">{l.salarie}</Link> : l.salarie}
                  </td>
                  {afficherEntreprise && <td className="py-2 text-gray-500">{l.entreprise}</td>}
                  <td className="py-2">{eur(l.base)}</td>
                  <td className="py-2" style={{ color: l.retenueSansSolde + l.retenueMaladie > 0 ? "#b91c1c" : undefined }}>
                    {l.retenueSansSolde + l.retenueMaladie > 0
                      ? `−${eur(l.retenueSansSolde + l.retenueMaladie)} (${l.joursSansSolde + l.joursMaladie} j)`
                      : "—"}
                  </td>
                  <td className="py-2">{l.heuresSupp > 0 ? `${eur(l.heuresSuppBrut)} (${l.heuresSupp} h)` : "—"}</td>
                  <td className="py-2">{l.primes > 0 ? eur(l.primes) : "—"}</td>
                  <td className="py-2 font-semibold">{eur(l.brut)}</td>
                  <td className="py-2">{eur(l.charges)} <span className="text-gray-400">({l.tauxCharges} %)</span></td>
                  <td className="py-2">{l.notesFrais > 0 ? eur(l.notesFrais) : "—"}</td>
                  <td className="py-2 font-bold" style={{ color: "#c2410c" }}>{eur(l.coutTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Version courte pour les dashboards */
export function EncartMasseSalariale({ data, lien }: { data: MasseSalariale; lien: string }) {
  const t = data.totaux;
  const items = [
    { label: "Brut total", valeur: eur(t.brut) },
    { label: "Charges", valeur: eur(t.charges) },
    { label: "Variables", valeur: eur(t.coutVariables) },
    { label: "Absences", valeur: t.retenueSansSolde + t.retenueMaladie > 0 ? `−${eur(t.retenueSansSolde + t.retenueMaladie)}` : "—" },
    { label: "Coût employeur", valeur: eur(t.coutTotal), fort: true },
  ];
  return (
    <Link href={lien} className="bg-white rounded-2xl shadow px-4 py-3 hover:shadow-md transition" style={{ display: "block" }}>
      <p className="text-sm font-bold" style={{ margin: "0 0 8px" }}>📈 Masse salariale — {NOMS_MOIS[data.mois - 1]} ({t.nbSalaries} salarié(s))</p>
      <div className="fr-grille-tuiles" style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "8px" }}>
        {items.map((i) => (
          <div key={i.label}>
            <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#6b7280" }}>{i.label}</p>
            <p style={{ margin: 0, fontSize: i.fort ? "20px" : "17px", fontWeight: 800, color: i.fort ? "#ea580c" : "#111827" }}>{i.valeur}</p>
          </div>
        ))}
      </div>
    </Link>
  );
}
