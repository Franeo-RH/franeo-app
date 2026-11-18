import { MENTIONS_TARIFS } from "@/lib/grille";

/** Mentions affichées sous les formules et les factures */
export default function MentionsFacturation({ logiciel = false }: { logiciel?: boolean }) {
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px 18px", marginTop: "20px", fontSize: "14px", color: "#4b5563", display: "flex", flexDirection: "column", gap: "6px" }}>
      <p style={{ margin: 0 }}>
        🧾 <strong>Facturation mensuelle</strong>, paiement par <strong>prélèvement SEPA mensuel</strong> : la facture est envoyée par e-mail, puis prélevée au plus tôt 2 jours après. Mandat à signer dans{" "}
        <a href="/client/entreprise#prelevement" style={{ color: "#f97316", fontWeight: 600 }}>Mon entreprise</a>.
      </p>
      {logiciel && (
        <p style={{ margin: 0 }}>
          ℹ️ Sous réserve d&apos;étude en cours, le prix inclut le logiciel de paie.
        </p>
      )}
      {MENTIONS_TARIFS.map((m) => <p key={m} style={{ margin: 0, fontSize: "13px" }}>• {m}</p>)}
      <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
        Les tickets RH inclus sont valables pour le mois en cours et ne sont pas reportés. Les options marquées « € » sont facturées à l&apos;acte et se commandent dans Paie › Prestations.
      </p>
    </div>
  );
}
